# Webapp Architecture Conventions

- Use React Router for routing, layouts, route params, navigation, guards, and
  route-level error boundaries.
- Use Relay for GraphQL data. Do not treat router loaders as a second GraphQL
  cache.
- Start route data with Relay route components and `useLazyLoadQuery`.
- If route preloading is needed later, add a small shared Relay helper around
  `loadQuery` and `usePreloadedQuery`, and make query reference disposal
  explicit.
- Keep GraphQL subscriptions on the shared Relay/realtime infrastructure. Route
  or feature code must not create its own websocket client.
- Use Tailwind CSS v4 with semantic CSS variables for theme tokens.
- Put reusable UI primitives in `src/shared/ui`; pages and feature components
  should compose those primitives instead of duplicating class strings.
- Use Radix primitives for accessible interactive UI when native HTML is not
  enough.
- Keep feature-specific product composition under `src/features`; keep
  cross-feature infrastructure under `src/shared`.
