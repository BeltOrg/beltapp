export function getAuthRedirectPath(routeState: unknown): string {
  if (typeof routeState !== "object" || routeState === null) {
    return "/home";
  }

  const from = (routeState as { from?: unknown }).from;
  if (
    typeof from !== "string" ||
    !from.startsWith("/") ||
    from.startsWith("//")
  ) {
    return "/home";
  }

  return from;
}
