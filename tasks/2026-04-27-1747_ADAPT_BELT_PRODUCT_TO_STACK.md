# Adapt Belt Product To Current Stack

## Goal

Turn the Belt dog-walking MVP idea from
[docs/project/Belt_application_documetation.md](../docs/project/Belt_application_documetation.md)
into an implementation plan for this repository's actual stack.

The idea document is product input. Firebase, Firestore transactions, mobile-only
architecture, and Dart controller examples are not implementation guidance for
this codebase.

Target stack for the first implementation:

- Backend: NestJS + GraphQL + TypeORM + PostgreSQL in [apps/server](../apps/server)
- Frontend: React + Vite + Relay in [apps/webapp](../apps/webapp)
- API contract: committed GraphQL SDL in [libs/api/schema.gql](../libs/api/schema.gql)
- Deployment baseline: existing Cloud Run, Cloudflare Pages, Rush Delivery, and
  Postgres/Redis infrastructure
- Future client: mobile app, consuming the same GraphQL API

## Product Boundary

Build the Belt MVP as a web-first service that can later support mobile without
rewriting backend contracts.

The current anonymous chat feature is an example for GraphQL subscriptions and
Relay wiring. It is not a product feature for Belt and should be removed after
the Belt domain replaces it.

The server app already has the preferred shape for this repository: feature
modules, resolvers, services, entities, DTOs, mappers, config, migrations, and
contract generation. Extend that shape for Belt unless implementation work
reveals a clear reason to improve it.

The webapp has useful Relay and GraphQL setup, but its current structure is
example-level. Belt work should keep the setup and reorganize the frontend into
modular feature areas so auth, dogs, orders, reviews, and shared UI do not
collapse into one flat component folder.

## Non-Goals For The First Belt Pass

- Do not add Firebase.
- Do not add Firestore.
- Do not build a mobile app yet.
- Do not build a complex chat system.
- Do not build live GPS tracking.
- Do not integrate real payments before the order lifecycle is reliable.
- Do not treat frontend checks as authoritative business enforcement.

## Domain Model

### Users

Represents a person who can act as an owner, a walker, or both.

Required fields:

- `id`
- `phone`
- `roles`
- `rating`
- `isVerified`
- `createdAt`
- `updatedAt`

Implementation notes:

- Store roles as an explicit enum set or join table, not free-form strings.
- Enforce unique phone numbers at the database level.
- Keep authentication identity separate enough that a future SMS provider or
  mobile client does not require rewriting the domain model.

### Dogs

Owned by users with the owner role.

Required fields:

- `id`
- `ownerId`
- `name`
- `size`
- `behaviorTags`
- `notes`
- `createdAt`
- `updatedAt`

Implementation notes:

- Restrict dog create/update/delete to the owning user.
- Do not allow an order to reference a dog owned by another user.

### Orders

Core workflow object connecting an owner, dog, location, time, price, and
eventual walker.

Required fields:

- `id`
- `ownerId`
- `walkerId`
- `dogId`
- `status`
- `priceAmount`
- `priceCurrency`
- `locationLat`
- `locationLng`
- `locationAddress`
- `startTime`
- `endTime`
- `createdAt`
- `acceptedAt`
- `startedAt`
- `finishedAt`
- `cancelledAt`
- `paidAt`

Implementation notes:

- Use a database-backed enum or constrained text for status.
- Use migrations for all schema changes.
- Add indexes for owner order lookup, walker order lookup, available order
  discovery, and active order discovery.
- Store price as integer minor units or a decimal with clear validation. Prefer
  integer minor units if no multi-currency complexity is needed.

### Reviews

Small MVP review after order completion.

Required fields:

- `id`
- `orderId`
- `reviewerId`
- `revieweeId`
- `rating`
- `comment`
- `createdAt`

Implementation notes:

- Allow reviews only after the order reaches `FINISHED` or `PAID`, depending on
  the final MVP payment rule.
- Prevent duplicate reviews for the same order/reviewer pair.

### Payments

MVP payment is mocked or internally marked.

Required fields:

- `orderId`
- payment state derived from order status or stored as a small payment record

Implementation notes:

- Keep the state transition to `PAID` explicit.
- Do not wire a real provider until the order flow is stable.

## Canonical Order State Machine

Use a single server-owned state machine. Clients may render state, but clients
must not decide whether a transition is legal.

GraphQL enum values should use API-style names:

```text
CREATED
ACCEPTED
STARTED
FINISHED
PAID
CANCELLED
```

Allowed transitions:

```text
CREATED  -> ACCEPTED
CREATED  -> CANCELLED
ACCEPTED -> STARTED
ACCEPTED -> CANCELLED
STARTED  -> FINISHED
FINISHED -> PAID
```

Forbidden transitions:

```text
CREATED  -> STARTED
CREATED  -> FINISHED
ACCEPTED -> FINISHED
STARTED  -> CANCELLED
FINISHED -> ACCEPTED
PAID     -> any state
CANCELLED -> any state
```

Actor rules:

- Owner can create an order.
- Owner can cancel an order while it is `CREATED` or `ACCEPTED`.
- Walker can accept an order only while it is `CREATED`.
- Assigned walker can start an order only while it is `ACCEPTED`.
- Assigned walker can finish an order only while it is `STARTED`.
- Walker can cancel only while it is `ACCEPTED`.
- No normal user can cancel after `STARTED`.
- Payment transition is server-owned and may be triggered by mock payment logic
  in the MVP.

Consistency and race-safety requirements:

- `acceptOrder` must be atomic.
- Exactly one walker can accept an order.
- Two simultaneous accepts must result in one success and one domain error.
- Do not implement this with a read-then-save sequence outside a transaction.
- Prefer a single conditional update that checks `status = CREATED` and
  `walker_id IS NULL`, then returns the updated row; a transaction with
  row-level locking is also acceptable.
- Database constraints should make impossible states hard to persist.
- Service methods must re-check permissions and expected status on the server.
- Error responses should be stable domain errors such as `ORDER_ALREADY_TAKEN`,
  `ORDER_INVALID_TRANSITION`, or `ORDER_FORBIDDEN`.

## GraphQL API Shape

### Auth And Session

Authentication should use a maintained, ready-to-use auth/session library or
framework integration instead of custom password/session plumbing. The app
should wrap that library behind an application auth boundary so additional
providers can be added later without rewriting domain services.

MVP mode does not need to solve production registration or SMS verification.
It may use seeded users, precreated database users, or a development-only auth
adapter that selects a known user. This keeps the first implementation focused
on Belt's domain flows and order consistency.

Real login/register/logout/account-removal behavior should be introduced
through the selected auth library/provider setup later. The GraphQL/API layer
should expose stable current-user semantics to the rest of the app regardless
of whether MVP mode uses seeded users or production mode uses external auth
providers.

Candidate operations:

- `requestLoginCode(phone: String!): RequestLoginCodePayload!`
- `verifyLoginCode(phone: String!, code: String!): AuthPayload!`
- `me: User`
- `logout: Boolean!`
- `removeMyAccount: Boolean!`
- `updateMyRoles(roles: [UserRole!]!): User!`

Requirements:

- Use an established auth/session package where possible.
- Keep provider-specific auth code outside business services.
- Support a simple MVP auth mode using seeded/precreated users.
- Add GraphQL context current-user support.
- Add guards for authenticated operations.
- Keep tokens/session mechanics compatible with browser now and mobile later.
- Never trust a client-provided `userId` for ownership-sensitive mutations.

### Dog API

Candidate operations:

- `myDogs: [Dog!]!`
- `dog(id: ID!): Dog!`
- `createDog(input: CreateDogInput!): Dog!`
- `updateDog(id: ID!, input: UpdateDogInput!): Dog!`
- `deleteDog(id: ID!): Boolean!`

Requirements:

- Owner-only access for dog mutations.
- Validate name, size, behavior tags, and notes.

### Order API

Candidate operations:

- `myOwnerOrders(statuses: [OrderStatus!]): [Order!]!`
- `myWalkerOrders(statuses: [OrderStatus!]): [Order!]!`
- `availableOrders: [Order!]!`
- `order(id: ID!): Order!`
- `createOrder(input: CreateOrderInput!): Order!`
- `acceptOrder(id: ID!): Order!`
- `startOrder(id: ID!): Order!`
- `finishOrder(id: ID!): Order!`
- `cancelOrder(id: ID!, reason: String): Order!`
- `markOrderPaid(id: ID!): Order!`

Requirements:

- Owner can see their own orders.
- Walker can see available orders and their assigned orders.
- Hide or reduce sensitive owner/dog details in public available-order lists if
  needed for privacy.
- All transition mutations delegate to one order workflow service.
- Add tests for every allowed and forbidden transition.
- Add a concurrency test for parallel `acceptOrder`.

### Review API

Candidate operations:

- `createOrderReview(orderId: ID!, input: CreateReviewInput!): Review!`
- `myReviews: [Review!]!`

Requirements:

- Only order participants can review.
- Reviews are allowed only after the correct terminal/completion state.

## Webapp Product Flow

Replace the anonymous chat home page with Belt flows.

Routes:

```text
/login
/role
/home
/dogs
/dogs/new
/dogs/:id
/orders/new
/orders/available
/orders/:id
/orders/:id/waiting
/orders/:id/active
/orders/:id/finish
/profile
```

Minimum screens:

- Splash/auth gate
- Login with phone verification
- Role selection
- Home dashboard adapted to current user roles
- Dog list
- Add/edit dog
- Create order
- Waiting screen for owner-created orders
- Available order list for walkers
- Active order screen
- Finish/review screen
- Profile/logout screen

State-driven navigation rules:

- `CREATED`: owner sees waiting/cancel; walkers see available order.
- `ACCEPTED`: owner sees assigned walker and waiting-to-start; assigned walker
  can start/cancel.
- `STARTED`: participants see active order; assigned walker can finish.
- `FINISHED`: participants see completion/review; payment can be marked.
- `PAID`: return to history/home.
- `CANCELLED`: return to history/home with cancelled state.

Frontend requirements:

- Use Relay against committed schema.
- Regenerate Relay artifacts after GraphQL changes.
- Render server errors as clear product messages.
- Keep forms simple and resilient.
- Do not expose privileged actions just because the route is reachable.

## GraphQL Subscription Resilience

Cloud Run can periodically drop long-lived WebSocket connections. This is an
expected platform behavior for our deployment target, so Belt realtime features
must treat GraphQL subscriptions as recoverable streams rather than permanent
connections.

The current anonymous chat implementation already contains the reference
solution:

- Server GraphQL subscriptions are enabled through `graphql-ws` in
  [apps/server/src/app.module.ts](../apps/server/src/app.module.ts).
- The server sets a `connectionInitWaitTimeout`, assigns a per-socket
  connection id, and logs `connect`, `disconnect`, and `subscribe` lifecycle
  events through structured subscription logs.
- The server-side chat pub/sub adapter in
  [apps/server/src/modules/chat/chat-pubsub.service.ts](../apps/server/src/modules/chat/chat-pubsub.service.ts)
  can use in-memory pub/sub locally or Redis in deployed/multi-instance
  environments. Redis is important because a reconnect may land on a different
  Cloud Run instance.
- The webapp centralizes the resilient `graphql-ws` client in
  [apps/webapp/src/shared/realtime/realtime-connection.ts](../apps/webapp/src/shared/realtime/realtime-connection.ts).
  [apps/webapp/src/realtime-connection.ts](../apps/webapp/src/realtime-connection.ts)
  is kept only as a temporary compatibility re-export for the current chat
  example.
- The client is lazy, sends heartbeat pings every 10 seconds, terminates the
  socket if a pong is not received within 5 seconds, retries forever for
  recoverable closes, and uses capped exponential backoff with jitter.
- Fatal GraphQL protocol close codes are not retried, so authentication or
  malformed-operation failures do not loop indefinitely.
- Browser `online` and `offline` events are exposed through
  `useRealtimeConnectionState`, allowing product UI to show connection state and
  temporarily disable realtime-dependent actions while the stream is recovering.
- Relay subscriptions are routed through the shared Relay environment in
  [apps/webapp/src/shared/relay/environment.ts](../apps/webapp/src/shared/relay/environment.ts),
  so individual components should not create their own websocket clients.
- The chat UI in
  [apps/webapp/src/components/chat/Chat.tsx](../apps/webapp/src/components/chat/Chat.tsx)
  demonstrates how a feature consumes `useSubscription`, shows live connection
  status, and handles retrying/disconnected states.

Belt should keep this behavior but move it from chat-specific knowledge into a
small realtime framework layer:

- Server realtime infrastructure should own GraphQL websocket setup,
  subscription lifecycle logging, current-user propagation for websocket
  operations, and the publish/subscribe adapter.
- Domain modules should publish typed domain events such as order accepted,
  order started, order finished, review created, and walker assignment changed.
- Product resolvers should expose subscriptions by delegating to the shared
  realtime/event layer rather than creating module-local websocket or pub/sub
  infrastructure.
- Webapp realtime infrastructure should continue to own the single
  `graphql-ws` client, heartbeat/reconnect policy, Relay subscription network
  integration, and connection-state store.
- Feature modules should only consume `useSubscription` plus shared connection
  state helpers.
- Reconnect behavior must be tested or smoke-tested by forcing socket
  termination and proving subscriptions resubscribe without a full page reload.

## Backend Implementation Phases

### Phase 1: Domain Foundation

- [x] Add user, dog, order, and review entities.
- [x] Add TypeORM migrations for new tables, enums, indexes, and constraints.
- [x] Add modules for users, dogs, orders, reviews, and auth.
- [x] Keep database config and migration patterns consistent with
      [apps/server/src/config/database.config.ts](../apps/server/src/config/database.config.ts).
- [x] Use the existing server module layout as the implementation template for
      Belt modules.
- [ ] Extract GraphQL subscription setup and lifecycle logging into shared
      realtime infrastructure before adding Belt subscriptions.
- [ ] Add websocket current-user propagation to the shared auth/realtime layer.
- [ ] Extract Redis/in-memory pub/sub into a reusable domain event adapter
      instead of keeping the pattern inside chat.
- [ ] Remove the chat module after Belt replaces its subscription example role,
      unless a short-lived compatibility period is needed during migration.

### Phase 2: Auth Foundation

- [ ] Choose the auth/session library integration point.
- [x] Add an application auth boundary so providers can be swapped later.
- [x] Add MVP auth mode using seeded/precreated users or a dev-only selector.
- [ ] Add phone-login API surface if it is still useful for the chosen library.
- [ ] Add dev/mock verification provider only if needed by MVP mode.
- [ ] Add session/token issuance and validation.
- [x] Add current user extraction to GraphQL context.
- [x] Add guards/decorators for authenticated resolvers.
- [ ] Add logout and account-removal entrypoints at the application boundary.
- [x] Add tests for authenticated and unauthenticated access.

### Phase 3: Dog Management

- [x] Implement dog CRUD service and resolver.
- [x] Enforce owner-only access.
- [x] Add validation for dog input.
- [x] Add GraphQL e2e tests for dog ownership rules.
- [ ] Add unit tests if dog management logic grows beyond simple ownership
      checks.

### Phase 4: Order Workflow

- [x] Implement canonical order status enum.
- [x] Implement order workflow service as the only transition authority.
- [x] Implement `createOrder`.
- [x] Implement race-safe `acceptOrder`.
- [x] Implement `startOrder`.
- [x] Implement `finishOrder`.
- [x] Implement `cancelOrder`.
- [x] Implement mock `markOrderPaid`.
- [x] Add transition matrix tests.
- [x] Add permission tests for owner, assigned walker, unrelated walker, and
      unauthenticated user.
- [x] Add parallel accept test proving exactly one walker succeeds.

### Phase 5: Reviews And Ratings

- [x] Implement review creation.
- [x] Prevent duplicate reviews.
- [ ] Update or compute user ratings.
- [x] Add tests for review eligibility.
- [ ] Add tests for rating updates after rating computation is implemented.

### Phase 6: GraphQL Contract And Relay

- [x] Update schema manifest for new resolvers/scalars as needed.
- [x] Regenerate [libs/api/schema.gql](../libs/api/schema.gql).
- [x] Regenerate webapp Relay artifacts.
- [ ] Keep server `graphql:check-contract` passing.

## Webapp Implementation Phases

### Phase 1: App Shell Rework

- [x] Reorganize `apps/webapp/src` into feature-oriented modules before the
      Belt UI grows too large.
- [x] Keep the existing Relay, GraphQL endpoint, subscription, and preload
      recovery setup while moving product code into the new structure.
- [x] Promote `realtime-connection` into shared webapp infrastructure used by
      all Belt subscription consumers.
- [x] Keep one websocket client for the app; feature modules must not create
      separate GraphQL websocket clients.
- [x] Replace chat-first home with Belt route structure.
- [x] Replace the temporary hand-written route matcher with React Router v7.
- [x] Keep Relay data fetching inside route components for now instead of
      mixing router loaders with Relay cache ownership.
- [x] Add Tailwind CSS v4 with semantic theme tokens.
- [x] Add reusable `src/shared/ui` primitives for common Belt UI.
- [ ] Add auth-aware routing.
- [ ] Add role-aware navigation.
- [x] Update branding from Anonymous Chat to Belt.

### Phase 2: Auth And Profile

- [x] Build phone login screen.
- [ ] Build verification flow.
- [x] Build role selection.
- [x] Build profile/logout screen.

### Phase 3: Owner Flow

- [x] Build dog list.
- [ ] Build add/edit dog.
- [x] Build create order shell.
- [ ] Build waiting order view.
- [ ] Build owner active/completion views.

### Phase 4: Walker Flow

- [ ] Build availability toggle or walker mode entry.
- [x] Build available orders list.
- [ ] Build accept order action with `ORDER_ALREADY_TAKEN` handling.
- [ ] Build active walk actions for start and finish.

### Phase 5: Reviews And Polish

- [ ] Build finish/review screen.
- [ ] Add loading, empty, and error states.
- [ ] Ensure responsive web layout remains usable on mobile-sized screens.

## Validation And CI

- [x] Add backend unit tests for state machine logic.
- [x] Add backend GraphQL resolver tests for key mutations.
- [x] Add an e2e test for parallel order acceptance.
- [ ] Update deployment smoke tests once the GraphQL surface changes.
- [ ] Add a realtime smoke test that terminates the websocket and verifies
      automatic resubscription without a page reload.
- [x] Run `npm --prefix apps/server run graphql:schema`.
- [x] Run `npm --prefix apps/webapp run relay`.
- [x] Run `npm --prefix apps/webapp run lint`.
- [x] Run `npm --prefix apps/webapp run build`.
- [x] Run Rush build/verify for affected projects.
- [ ] Keep local devcontainer flow working with Postgres and Redis.

## Deployment And Operations Updates

- [ ] Update Cloud Run env examples if auth/session secrets are introduced.
- [ ] Update Secret Manager sync script if new backend secrets are required.
- [ ] Update webapp env examples if API or auth wiring changes.
- [ ] Update post-deploy smoke tests from chat operations to Belt operations.
- [ ] Update docs that still describe Anonymous Chat as the product once Belt
      becomes the active app.

## Open Decisions That Should Not Block The First Technical Slice

- Auth/session library and provider list for production.
- SMS provider for production phone verification.
- Payment provider and payment hold mechanics.
- Map/geocoding provider.
- Whether walker availability is a stored setting or derived from current UI
  mode for the MVP.
- Whether cancellation reasons are structured enum values or free text.
- Whether chat between owner and walker is added after the core order flow.

For the first implementation, use clear abstractions and dev/mock adapters so
these provider decisions can be made later without weakening the state machine
or database model.

## Completion Criteria

- [x] Belt replaces Anonymous Chat as the main product flow.
- [ ] Users can log in, select roles, and access role-appropriate screens.
- [ ] Owners can manage dogs.
- [ ] Owners can create and cancel orders.
- [ ] Walkers can list and accept available orders.
- [ ] Parallel accept attempts cannot double-assign an order.
- [ ] Assigned walkers can start and finish walks.
- [ ] Orders follow the canonical state machine and reject invalid transitions.
- [ ] Completed orders can be reviewed.
- [ ] Chat example code is removed from the product path.
- [x] Webapp product code is organized into Belt feature modules.
- [ ] GraphQL contract, Relay artifacts, tests, and smoke checks match the Belt
      domain.
- [ ] Local dev and deployment workflows remain usable.
