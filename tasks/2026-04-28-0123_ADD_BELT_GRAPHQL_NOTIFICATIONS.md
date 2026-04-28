# Add Belt GraphQL Notifications

## Goal

Add Belt live GraphQL notifications so data changes made by one user become
visible to other relevant users without a manual page refresh.

This task covers the product realtime layer. The existing chat subscription is
only an example and should be replaced by reusable Belt subscription
infrastructure.

Relevant source areas:

- Webapp routes: [apps/webapp/src/app/App.tsx](../apps/webapp/src/app/App.tsx)
- Webapp Relay environment:
  [apps/webapp/src/shared/relay/environment.ts](../apps/webapp/src/shared/relay/environment.ts)
- Webapp websocket client:
  [apps/webapp/src/shared/realtime/realtime-connection.ts](../apps/webapp/src/shared/realtime/realtime-connection.ts)
- Current API contract: [libs/api/schema.gql](../libs/api/schema.gql)
- Server subscription setup:
  [apps/server/src/app.module.ts](../apps/server/src/app.module.ts)
- Current chat PubSub reference:
  [apps/server/src/modules/chat/chat-pubsub.service.ts](../apps/server/src/modules/chat/chat-pubsub.service.ts)

## Principles

- Use GraphQL subscriptions through Relay. Do not create page-local websocket
  clients.
- Keep React Router responsible for routing, guards, and layouts. Keep Relay
  responsible for server/domain data.
- Treat Cloud Run websocket connections as disposable. The client must recover
  from periodic connection closure through the shared realtime client.
- Publish events only after a durable server mutation succeeds.
- Treat subscriptions as live UI synchronization, not as the source of truth.
  Queries and mutations remain authoritative.
- Make Relay store updaters narrow, idempotent, and keyed by stable IDs.
- Keep authorization on the server. Clients must not receive events for users,
  dogs, orders, or reviews they are not allowed to see.

## Current State

The webapp already has Relay subscription transport in
`shared/relay/environment.ts`, backed by `graphql-ws` in
`shared/realtime/realtime-connection.ts`.

The server currently exposes only the chat subscription:

```graphql
type Subscription {
  MessageAdded: Message!
}
```

Belt queries and mutations are implemented without Belt subscription fields.
Chat PubSub supports memory and Redis drivers, which is the right deployment
shape for Cloud Run multi-instance behavior, but it is chat-specific today.

## Cloud Run Connection Lifecycle

Cloud Run can close long-lived websocket connections on timeout or instance
lifecycle changes. Belt subscriptions must assume that live connections will be
closed periodically even when the app and network are healthy.

The webapp already centralizes this in
`apps/webapp/src/shared/realtime/realtime-connection.ts`:

- `graphql-ws` retries indefinitely for non-fatal closures.
- Heartbeats detect stuck sockets and terminate them so reconnect can happen.
- Browser online/offline state is exposed through shared connection status.
- Relay subscription transport uses this shared client from
  `apps/webapp/src/shared/relay/environment.ts`.

All new Belt subscription consumers must reuse that shared path. Feature code
should not create its own websocket client, retry loop, or connection state
store.

Because reconnect cannot deliver events that happened while the socket was
closed, implementation must also decide whether reconnect should trigger a
route-level refetch for active Belt queries.

## Subscription Contract

Prefer a small Belt domain event subscription first:

```graphql
type Subscription {
  beltEvent: BeltEvent!
}

type BeltEvent {
  id: ID!
  type: BeltEventType!
  occurredAt: Date!
  subjectId: ID!
  user: User
  dog: Dog
  order: Order
  review: Review
}
```

Use nullable payload fields so delete and visibility-change events can still
carry `subjectId` even when the full object is unavailable to the subscriber.
Avoid GraphQL unions for the first pass unless Relay codegen and store updaters
stay simpler with typed subscription fields.

Initial event types:

- `USER_UPDATED`
- `DOG_CREATED`
- `DOG_UPDATED`
- `DOG_DELETED`
- `ORDER_CREATED`
- `ORDER_UPDATED`
- `ORDER_ACCEPTED`
- `ORDER_STARTED`
- `ORDER_FINISHED`
- `ORDER_CANCELLED`
- `ORDER_PAID`
- `REVIEW_CREATED`

## Visibility Rules

- A user receives `USER_UPDATED` only for their own user record.
- An owner receives dog events only for their own dogs.
- An owner receives order events for their own orders.
- A walker receives order events for orders assigned to them.
- A walker receives available-order events when an order becomes available or
  leaves the available pool.
- An order participant receives review events for reviews where they are the
  reviewer or reviewee.
- Unauthenticated connections must not subscribe to Belt events.

## Page Integration Matrix

### App Shell And Navigation

Route area: `AppLayout`, `AuthenticatedRoute`, `Navigation`

- Subscribe to `USER_UPDATED` for the current user so role, rating, and
  verification changes update navigation and guards.
- Update the auth session cache when roles change, because navigation visibility
  currently reads from `useAuthSession`.
- Show shared live-update connection status only from the shared realtime state,
  not from route-local state.

### Home

Route: `/home`

Current query fields: `me`, `myDogs`, `myOwnerOrders`, `myWalkerOrders`

- Apply `USER_UPDATED` to `me`.
- Apply `DOG_CREATED`, `DOG_UPDATED`, and `DOG_DELETED` to `myDogs`.
- Apply order lifecycle events to `myOwnerOrders` and `myWalkerOrders`.
- Remove paid and cancelled orders from active dashboard rendering through the
  existing status filter.
- Update rating after `REVIEW_CREATED` if the reviewed user is the current user.

### Role

Route: `/role`

Current mutation: `updateMyRoles`

- Apply `USER_UPDATED` to the current auth session and Relay `me` record.
- Keep the mutation updater as the optimistic/local path for the initiating tab.
- Use the subscription path for another tab or future admin-driven role changes.

### Dogs List

Route: `/dogs`

Current query field: `myDogs`

- Add new owner dogs on `DOG_CREATED`.
- Replace list item fields on `DOG_UPDATED`.
- Remove deleted dogs on `DOG_DELETED`.
- Keep the empty state live so it changes when the first dog is created or the
  last dog is deleted in another tab.

### Dog Detail

Route: `/dogs/:dogId`

Current query field: `dog(id)`

- Update visible dog fields on `DOG_UPDATED` for the current dog.
- On `DOG_DELETED`, show a not-found/deleted state or navigate back to `/dogs`.
- Do not subscribe to unrelated dogs.

### Dog Editor

Routes: `/dogs/new`, `/dogs/:dogId/edit`

Current edit query field: `dog(id)`

- For edit mode, apply `DOG_UPDATED` to refresh defaults if another session
  changes the same dog.
- For edit mode, handle `DOG_DELETED` by disabling submit and routing back to
  the dog list.
- For create mode, no route-specific subscription is required beyond the global
  owner dog-list subscription.

### Create Walk

Route: `/orders/new`

Current query field: `myDogs`

- Apply dog events to the dog selector so newly added or deleted dogs are
  reflected before order submission.
- If the selected dog is deleted in another tab, clear the selection and show a
  form-level message.
- After `createOrder`, publish an order event so walkers see the new walk in
  `/orders/available`.

### Available Walks

Route: `/orders/available`

Current query field: `availableOrders`

- Add orders on `ORDER_CREATED` when the order is available to walkers.
- Update cards on `ORDER_UPDATED` while the order is still available.
- Remove orders on `ORDER_ACCEPTED`, `ORDER_CANCELLED`, `ORDER_STARTED`,
  `ORDER_FINISHED`, and `ORDER_PAID`.
- If another walker accepts an order while this page is open, remove it without
  requiring a refresh.

### Walk Order Detail

Routes: `/orders/:orderId`, `/orders/:orderId/waiting`,
`/orders/:orderId/active`, `/orders/:orderId/finish`

Current query fields: `order(id)`, `myReviews`

- Subscribe narrowly to the current order.
- Update status, actor IDs, timestamps, price, and location fields on order
  lifecycle events.
- Recompute available actions after every order event.
- If an unassigned walker is viewing an order and another walker accepts it,
  remove the accept action and show the updated assigned state.
- Add `REVIEW_CREATED` to `myReviews` when the current user is reviewer or
  reviewee.
- Update participant ratings after `REVIEW_CREATED` if the server publishes the
  changed user record.

### Profile

Route: `/profile`

Current query field: `me`

- Apply `USER_UPDATED` to phone, roles, rating, and verification state.
- Keep logout local; no realtime subscription is needed for logout.

### Login And Not Found

Routes: `/login`, wildcard route

- No Belt subscription is required while unauthenticated.
- Ensure active subscriptions are disposed when the user logs out or the route
  tree remounts for an anonymous session.

## Server Checklist

- [x] Add a shared realtime PubSub module that can
      publish typed domain events through memory or Redis.
- [x] Add authenticated websocket context for `graphql-ws` connection params so
      subscription guards can identify the current user.
- [x] Add Belt subscription GraphQL models, event enum, and resolver.
- [x] Implement server-side subscription filtering for the first order/user
      event slice.
- [ ] Publish events from user, dog, order, and review mutations after the
      database write completes.
- [x] Publish order events after order mutations complete.
- [x] Ensure order events are emitted after atomic state transitions, especially
      competing `acceptOrder` calls.
- [x] Add tests for event publishing and authorization filtering.
- [ ] Keep chat subscription only until Belt subscriptions cover the reusable
      example behavior, then remove the chat GraphQL surface.

## Webapp Checklist

- [x] Add a shared Belt subscription hook around Relay `useSubscription`.
- [x] Add shared Relay store updater helpers for root list add, replace, and
      remove operations.
- [ ] Add a current-user subscription at the app/session layer for `me` and
      auth-session cache updates.
- [ ] Add owner dog event handling for dashboard, dog list, dog detail, dog
      editor, and create-walk selector flows.
- [x] Add dashboard order event handling for owner and walker active walks.
- [x] Add available-order event handling for walker discovery.
- [x] Add current-order event handling for all order detail views.
- [ ] Add review event handling for order detail and rating updates.
- [x] Reuse the existing realtime connection status API for subscriptions; do
      not
      create new connection state stores.
- [x] Ensure subscription disposables are cleaned up by Relay route unmount and
      session-scoped Relay environment remounts.

## Validation Checklist

- [x] Run GraphQL schema generation and Relay compiler after adding subscription
      fields.
- [x] Run server tests covering visibility and event publication.
- [x] Run webapp checks and build.
- [ ] Manual smoke: owner creates a walk and walker sees it in available walks
      without refresh.
- [ ] Manual smoke: two walkers view the same available walk; one accepts, the
      other loses the accept action without refresh.
- [ ] Manual smoke: walker starts and finishes an order while owner detail view
      updates live.
- [ ] Manual smoke: owner marks paid and walker dashboard/order detail update
      live.
- [ ] Manual smoke: one participant reviews and the other participant sees the
      review/rating update live.
- [ ] Reconnect smoke: terminate or restart the websocket connection and verify
      active subscriptions recover on Cloud Run-style disconnects.

## Open Decisions

- Decide whether the first implementation uses one broad `beltEvent`
  subscription or several typed subscriptions if Relay updaters become clearer.
- Decide whether reconnect should trigger route-level refetch for currently
  mounted Belt queries to cover events missed during downtime.
- Decide whether live updates should be silent store updates only, or whether
  some flows need small visible notices.
