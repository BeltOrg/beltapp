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

## Backend Implementation Phases

### Phase 1: Domain Foundation

- [ ] Add user, dog, order, and review entities.
- [ ] Add TypeORM migrations for new tables, enums, indexes, and constraints.
- [ ] Add modules for users, dogs, orders, reviews, and auth.
- [ ] Keep database config and migration patterns consistent with
      [apps/server/src/config/database.config.ts](../apps/server/src/config/database.config.ts).
- [ ] Use the existing server module layout as the implementation template for
      Belt modules.
- [ ] Remove the chat module after Belt replaces its subscription example role,
      unless a short-lived compatibility period is needed during migration.

### Phase 2: Auth Foundation

- [ ] Choose the auth/session library integration point.
- [ ] Add an application auth boundary so providers can be swapped later.
- [ ] Add MVP auth mode using seeded/precreated users or a dev-only selector.
- [ ] Add phone-login API surface if it is still useful for the chosen library.
- [ ] Add dev/mock verification provider only if needed by MVP mode.
- [ ] Add session/token issuance and validation.
- [ ] Add current user extraction to GraphQL context.
- [ ] Add guards/decorators for authenticated resolvers.
- [ ] Add logout and account-removal entrypoints at the application boundary.
- [ ] Add tests for authenticated and unauthenticated access.

### Phase 3: Dog Management

- [ ] Implement dog CRUD service and resolver.
- [ ] Enforce owner-only access.
- [ ] Add validation for dog input.
- [ ] Add unit and resolver tests.

### Phase 4: Order Workflow

- [ ] Implement canonical order status enum.
- [ ] Implement order workflow service as the only transition authority.
- [ ] Implement `createOrder`.
- [ ] Implement race-safe `acceptOrder`.
- [ ] Implement `startOrder`.
- [ ] Implement `finishOrder`.
- [ ] Implement `cancelOrder`.
- [ ] Implement mock `markOrderPaid`.
- [ ] Add transition matrix tests.
- [ ] Add permission tests for owner, assigned walker, unrelated walker, and
      unauthenticated user.
- [ ] Add parallel accept test proving exactly one walker succeeds.

### Phase 5: Reviews And Ratings

- [ ] Implement review creation.
- [ ] Prevent duplicate reviews.
- [ ] Update or compute user ratings.
- [ ] Add tests for review eligibility and rating updates.

### Phase 6: GraphQL Contract And Relay

- [ ] Update schema manifest for new resolvers/scalars as needed.
- [ ] Regenerate [libs/api/schema.gql](../libs/api/schema.gql).
- [ ] Regenerate webapp Relay artifacts.
- [ ] Keep server `graphql:check-contract` passing.

## Webapp Implementation Phases

### Phase 1: App Shell Rework

- [ ] Reorganize `apps/webapp/src` into feature-oriented modules before the
      Belt UI grows too large.
- [ ] Keep the existing Relay, GraphQL endpoint, subscription, and preload
      recovery setup while moving product code into the new structure.
- [ ] Replace chat-first home with Belt route structure.
- [ ] Add auth-aware routing.
- [ ] Add role-aware navigation.
- [ ] Update branding from Anonymous Chat to Belt.

### Phase 2: Auth And Profile

- [ ] Build phone login screen.
- [ ] Build verification flow.
- [ ] Build role selection.
- [ ] Build profile/logout screen.

### Phase 3: Owner Flow

- [ ] Build dog list.
- [ ] Build add/edit dog.
- [ ] Build create order.
- [ ] Build waiting order view.
- [ ] Build owner active/completion views.

### Phase 4: Walker Flow

- [ ] Build availability toggle or walker mode entry.
- [ ] Build available orders list.
- [ ] Build accept order action with `ORDER_ALREADY_TAKEN` handling.
- [ ] Build active walk actions for start and finish.

### Phase 5: Reviews And Polish

- [ ] Build finish/review screen.
- [ ] Add loading, empty, and error states.
- [ ] Ensure responsive web layout remains usable on mobile-sized screens.

## Validation And CI

- [ ] Add backend unit tests for state machine logic.
- [ ] Add backend GraphQL resolver tests for key mutations.
- [ ] Add an e2e test for parallel order acceptance.
- [ ] Update deployment smoke tests once the GraphQL surface changes.
- [ ] Run `npm --prefix apps/server run graphql:schema`.
- [ ] Run `npm --prefix apps/webapp run relay`.
- [ ] Run Rush build/verify for affected projects.
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

- [ ] Belt replaces Anonymous Chat as the main product flow.
- [ ] Users can log in, select roles, and access role-appropriate screens.
- [ ] Owners can manage dogs.
- [ ] Owners can create and cancel orders.
- [ ] Walkers can list and accept available orders.
- [ ] Parallel accept attempts cannot double-assign an order.
- [ ] Assigned walkers can start and finish walks.
- [ ] Orders follow the canonical state machine and reject invalid transitions.
- [ ] Completed orders can be reviewed.
- [ ] Chat example code is removed from the product path.
- [ ] Webapp product code is organized into Belt feature modules.
- [ ] GraphQL contract, Relay artifacts, tests, and smoke checks match the Belt
      domain.
- [ ] Local dev and deployment workflows remain usable.
