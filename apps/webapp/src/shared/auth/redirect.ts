const DEFAULT_AUTH_REDIRECT_PATH = "/dashboard";

export function getAuthRedirectPath(routeState: unknown): string {
  if (typeof routeState !== "object" || routeState === null) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  const from = (routeState as { from?: unknown }).from;
  if (
    typeof from !== "string" ||
    !from.startsWith("/") ||
    from.startsWith("//")
  ) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  if (
    from === "/home" ||
    from.startsWith("/home?") ||
    from.startsWith("/home#")
  ) {
    return from.replace("/home", DEFAULT_AUTH_REDIRECT_PATH);
  }

  return from;
}
