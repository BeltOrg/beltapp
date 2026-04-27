# Belt - Documentation and Full Technical Specification (MVP)

We are building an application of the following kind:

- There are people who have dogs and need a dog-walking service.
- There are people who are willing to provide this service.
- Our network will allow these people to find each other and arrange dog walking.

## Table of Contents

1. [General Information](#1-general-information)
2. [User Roles](#2-user-roles)
3. [Main User Flows](#3-main-user-flows)
4. [Order State Machine](#4-order-state-machine-critical)
5. [Data Models](#5-data-models)
6. [Database Structure (Firebase Firestore)](#6-database-structure-firebase-firestore)
7. [Order Acceptance Logic (Race Condition)](#7-order-acceptance-logic-race-condition)
8. [Application Screens](#8-application-screens)
9. [Navigation](#9-navigation)
10. [Controllers](#10-controllers)
11. [Payment (MVP)](#11-payment-mvp)
12. [Geolocation](#12-geolocation)
13. [Application Architecture](#13-application-architecture)
14. [MVP Limitations](#14-mvp-limitations)
15. [Critical Requirements](#15-critical-requirements)
16. [Development Stages](#16-development-stages)
17. [Definition of Done](#17-definition-of-done)
18. [Summary](#summary)

## 1. General Information

**Name:** Belt

**Product type:** Mobile application (iOS / Android)

**Geography:** Estonia (first city: Tallinn)

**MVP goal:** Validate the hypothesis that users are willing to buy and sell dog walking services through a mobile application.

## 2. User Roles

### 2.1 Owner (Dog Owner)

Functions:

- Create an order.
- Manage dogs.
- Track a walk.
- Rate a walker.

### 2.2 Walker

Functions:

- View orders.
- Accept an order.
- Perform a walk.
- Complete an order.

### 2.3 Combined Role

One user can be:

- Owner.
- Walker.
- Both.

## 3. Main User Flows

### 3.1 Owner Flow

Registration -> Add dog -> Create order -> Waiting -> Walk -> Completion -> Review

### 3.2 Walker Flow

Registration -> Turn on "available" status -> View orders -> Accept -> Start -> Complete

## 4. Order State Machine (Critical)

### Description of a Potential Problem

Scenario:

- An order is in the `Created` status.
- Five walkers can see it.
- Two walkers tap `Accept` almost at the same time.
- Both have fast internet connections.

What can happen:

- Both walkers think they accepted the order.
- `walkerId` is overwritten in the database.
- A conflict occurs.
- Negative reviews appear.
- Trust is lost.

### MVP Solution (Firebase)

Use a Firestore transaction.

Transaction:

```text
Read -> check -> modify -> save
```

If someone changed the data earlier, the transaction fails.

### State Machine

#### 4.1 Order Statuses

- `Created`
- `Accepted`
- `Started`
- `Finished`
- `Paid`
- `Cancelled`

#### 4.2 Allowed Transitions

- `Created` -> `Accepted`
- `Created` -> `Cancelled`
- `Accepted` -> `Started`
- `Accepted` -> `Cancelled`
- `Started` -> `Finished`
- `Finished` -> `Paid`

#### 4.3 Restrictions

- An order cannot be accepted unless it is in the `Created` status.
- An order cannot be started unless it is in the `Accepted` status.
- An order cannot be finished unless it is in the `Started` status.
- An order cannot be cancelled after `Started`.

Forbidden:

- `Created` -> `Started`
- `Started` -> `Cancelled`
- `Finished` -> `Accepted`

Business rules:

- Only one walker can accept an order, enforced through a transaction.
- Cancellation is possible only before `Started`.
- After `Started`, the order can only be completed.

## 5. Data Models

### 5.1 User

```json
{
  "id": "string",
  "phone": "string",
  "roles": ["owner", "walker"],
  "rating": 0,
  "isVerified": false,
  "createdAt": "timestamp"
}
```

### 5.2 Dog

```json
{
  "id": "string",
  "ownerId": "string",
  "name": "string",
  "size": "S | M | L",
  "behavior": ["friendly", "aggressive"],
  "notes": "string",
  "createdAt": "timestamp"
}
```

### 5.3 Order

```json
{
  "id": "string",
  "ownerId": "string",
  "walkerId": null,
  "dogId": "string",
  "status": "Created",
  "price": 10.0,
  "location": {
    "lat": "number",
    "lng": "number",
    "address": "string"
  },
  "startTime": "timestamp",
  "endTime": "timestamp",
  "createdAt": "timestamp",
  "acceptedAt": null,
  "startedAt": null,
  "finishedAt": null
}
```

## 6. Database Structure (Firebase Firestore)

```text
users/{userId}
dogs/{dogId}
orders/{orderId}
```

## 7. Order Acceptance Logic (Race Condition)

Requirement:

Only one walker can accept an order.

Implementation:

Use a Firestore transaction.

Transaction:

```text
get order

if status != Created -> fail

update:
  status = Accepted
  walkerId = currentUser
```

If it fails:

```text
Show "Order already taken"
```

Algorithm:

1. Get the order.
2. Check `status == Created`.
3. If not, return an error.
4. If yes:
   - Set `status = Accepted`.
   - Set `walkerId = currentUser`.

Pseudocode:

```dart
FirebaseFirestore.instance.runTransaction((transaction) async {
  DocumentSnapshot snapshot = await transaction.get(orderRef);

  if (snapshot['status'] != 'Created') {
    throw Exception("Order already taken");
  }

  transaction.update(orderRef, {
    'status': 'Accepted',
    'walkerId': currentUserId
  });
});
```

### What Happens During Simultaneous Accept

Scenario:

- Walker A.
- Walker B.
- Both start the transaction.

Flow:

1. The first transaction succeeds and changes the status to `Accepted`.
2. The second transaction tries to save.
3. Firestore sees that the data has changed.
4. The second transaction fails.

The second walker receives an error:

```text
Order already taken
```

The UI should show:

```text
Sorry, another walker accepted this order
```

### Error Behavior

Show the message:

```text
Order already accepted
```

Important:

- This is not solved at the UI level.
- This is solved only at the database level.

Do not:

- Only check `status` before `update`.
- Perform a regular `update`.
- Rely on latency.

### Future Alternative

In the future, this can be implemented with:

- Cloud Function.
- Server-side logic.
- Locking system.

For the MVP, a Firestore transaction is enough.

### Architectural Impact

`OrderController` must have the following method:

```dart
Future<bool> acceptOrder(String orderId)
```

Returns:

- `true`: success.
- `false`: someone else accepted the order first.

The UI reacts to the result.

### UX Behavior

If the transaction fails, show:

```text
Order already accepted by another walker
```

Then automatically return the user to `Home`.

### Cancellation Logic

Important: who can cancel?

Owner:

- While the status is `Created` or `Accepted`.

Walker:

- Only when the status is `Accepted`.

Cannot cancel:

- If the status is `Started`.

After `Started`:

- Cancellation is forbidden.
- Only support can handle this in the future.

### UI Mapping

If the status is:

- `Created`: `WaitingScreen`.
- `Accepted`: `ActiveOrderScreen` while waiting for the start.
- `Started`: `ActiveOrderScreen` with timer.
- `Finished`: `FinishScreen`.
- `Paid`: `Home`.
- `Cancelled`: `Home`.

Navigation depends on the status.

## 8. Application Screens

### 8.1 Splash Screen

Functions:

- Check authorization.

Transitions:

- Not authorized -> `Login`.
- Authorized -> `Home`.

### 8.2 Login Screen

Elements:

- Phone field.
- `Continue` button.

Functions:

- SMS authorization.

### 8.3 Role Select Screen

Elements:

- `Owner` checkbox.
- `Walker` checkbox.
- `Continue` button.

### 8.4 Home Screen

Owner buttons:

- `Find Walker`.
- `My Dogs`.
- `Profile`.

Walker buttons:

- `Toggle Available`.
- `View Orders`.
- `Profile`.

### 8.5 Dog List Screen

Functions:

- View dogs.
- Delete dogs.
- Edit dogs.

Buttons:

- `Add Dog`.

### 8.6 Add/Edit Dog

Fields:

- `Name`.
- `Size`.
- `Behavior`.
- `Notes`.

Buttons:

- `Save`.
- `Cancel`.

### 8.7 Create Order

Fields:

- `Dog`.
- `Address`.
- `Time`.
- `Duration`.
- `Price`.

Buttons:

- `Create`.
- `Cancel`.

### 8.8 Waiting Screen

Functions:

- Search for a walker.

Buttons:

- `Cancel Order`.

### 8.9 Active Order Screen

Owner functions:

- Walker info.
- Timer.
- Map.

Owner buttons:

- `Chat`.
- `SOS`.

Walker functions:

- Dog info.

Walker buttons:

- `Start Walk`.
- `Finish Walk`.

### 8.10 Finish Screen

Functions:

- Review.

Buttons:

- `Submit Review`.

### 8.11 Profile Screen

Functions:

- User information.

Buttons:

- `Logout`.

## 9. Navigation

```text
/login
/role
/home
/dogs
/add-dog
/create-order
/waiting
/active-order
/finish
/profile
```

## 10. Controllers

### OrderController

Methods:

- `createOrder()`
- `acceptOrder()`
- `startOrder()`
- `finishOrder()`
- `cancelOrder()`

## 11. Payment (MVP)

Simplified logic:

- Order creation -> hold or mock.
- Completion -> charge.
- Status -> `Paid`.

## 12. Geolocation

MVP:

- The order location point is saved.
- Live tracking is not required.

## 13. Application Architecture

```text
UI (Screens)
  |
Controllers
  |
Services
  |
Firebase
```

## 14. MVP Limitations

Do not implement:

- Subscriptions.
- Admin panel.
- Complex chat.
- Analytics.
- Insurance.

## 15. Critical Requirements

- The state machine is implemented correctly.
- A transaction is used during `accept`.
- There is no double assignment.
- The logic does not break with poor internet.
- The UI is simple and stable.

## 16. Development Stages

### Stage 1

- Auth.
- Navigation.
- Empty screens.

### Stage 2

- Full order flow using mocks.

### Stage 3

- Firebase integration.

### Stage 4

- Real order logic.

### Stage 5

- Payment.

## 17. Definition of Done

The MVP is considered ready if:

- An order can be created.
- Another user can accept it.
- A walk proceeds correctly.
- There is no race condition.
- Basic UI exists.
- The application is stable.

### Development Priority

- Auth and roles.
- Navigation.
- Order flow without backend.
- Firebase integration.
- Transaction logic.
- Finish flow.

## Summary

This technical specification describes:

- Full business logic.
- Architecture.
- Data.
- Screens.
- System behavior.

### Future Development

What should happen if:

- A walker accepted an order.
- But never tapped `Start`.

Should there be:

- Auto-cancellation timer?
- Penalty?
- Reassignment?

This is product logic for a later stage.

Next areas:

- Money and holds.
- Timeouts and auto-cancellation.
- GPS and walk start verification.
