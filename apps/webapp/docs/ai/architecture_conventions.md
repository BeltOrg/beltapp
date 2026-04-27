# Webapp Architecture Conventions

- Use React Router for routing, layouts, route params, navigation, guards, and
  route-level error boundaries.
- Use Relay for GraphQL data. Do not treat router loaders as a second GraphQL
  cache.
- Start route data with Relay route components and `useLazyLoadQuery`.
- Prefer `store-and-network` for route queries so cached content remains stable
  while Relay refreshes data.
- If route preloading is needed later, add a small shared Relay helper around
  `loadQuery` and `usePreloadedQuery`, and make query reference disposal
  explicit.
- Keep GraphQL subscriptions on the shared Relay/realtime infrastructure. Route
  or feature code must not create its own websocket client.
- Relay owns server/domain state. Do not duplicate GraphQL records in Redux or
  another app cache.
- React Router owns URL, route params, search params, navigation, and route
  errors.
- React local state owns temporary UI state such as form drafts, open controls,
  and transient validation messages.
- Add Redux only if the app gains complex client-only state that Relay, Router,
  and local React state cannot own cleanly.
- Do not key routed page content by pathname. Remount only at true ownership
  boundaries, such as current session or Relay environment changes.
- Use Tailwind CSS v4 with semantic CSS variables for theme tokens.
- Put reusable UI primitives in `src/shared/ui`; pages and feature components
  should compose those primitives instead of duplicating class strings.
- Use Radix primitives for accessible interactive UI when native HTML is not
  enough.
- Keep feature-specific product composition under `src/features`; keep
  cross-feature infrastructure under `src/shared`.
