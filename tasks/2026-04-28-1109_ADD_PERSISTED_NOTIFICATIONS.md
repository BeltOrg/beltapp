# Add Persisted Notifications

## Goal

Add a social-style notification feature for Belt so users can see important
events from the header after reloads, not only while GraphQL subscriptions are
connected.

This is separate from raw Belt realtime events:

- `beltEvent` keeps Relay records synchronized.
- Persisted notifications are user-facing product records with read state,
  copy, and links.

## MVP Decisions

- Store notifications in PostgreSQL.
- Add a dedicated server notifications module.
- Expose dedicated notification GraphQL queries, mutations, and subscription.
- Show a bell dropdown in the webapp header next to the account button.
- Use Relay for notification data and subscription updates.
- Keep notifications best-effort from domain mutations so a notification write
  failure does not break the core order or review workflow.

## Initial Notification Rules

- Notify walkers when a new walk becomes available.
- Notify owners when a walker accepts, starts, or finishes their walk.
- Notify the other participant when an order is cancelled.
- Notify walkers when an owner marks a walk as paid.
- Notify reviewees when a participant reviews them.
- Do not persist low-value events such as role edits or dog profile edits yet.

## Open Decisions

- Whether available-walk notifications should go to all walkers or only nearby
  or currently-available walkers once availability/location exists.
- Whether notifications should group repeated events by order.
- Whether old notifications should expire or be archived.
- Whether reconnect should refetch notification lists in addition to relying on
  the notification subscription.

## Server Checklist

- [x] Add notification entity, enum, migration, mapper, module, service, and
      resolver.
- [x] Add `myNotifications`, `myUnreadNotificationCount`,
      `markNotificationRead`, and `markAllNotificationsRead`.
- [x] Add a dedicated `notificationCreated` subscription filtered by recipient.
- [x] Create persisted notifications from order and review domain mutations.
- [x] Add tests for notification creation and read-state behavior.
- [x] Regenerate GraphQL schema.

## Webapp Checklist

- [x] Add a notification bell/dropdown component in the header.
- [x] Query the latest notifications and unread count.
- [x] Subscribe to `notificationCreated` and prepend new records live.
- [x] Mark a notification read when opened from the dropdown.
- [x] Add a mark-all-read action.
- [x] Keep empty, loading, error, and mobile header states usable.
- [x] Regenerate Relay artifacts and run webapp checks.

## Validation Checklist

- [ ] Owner creates a walk; walker receives a persisted notification.
- [ ] Walker accepts/starts/finishes; owner receives notifications.
- [ ] Owner marks paid; walker receives a notification.
- [ ] One participant reviews; the other receives a notification.
- [ ] Notifications survive page reload.
- [ ] Bell unread count updates live and clears after mark-read actions.
