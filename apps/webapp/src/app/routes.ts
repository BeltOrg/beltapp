export type BeltRoute =
  | { kind: "home" }
  | { kind: "login" }
  | { kind: "role" }
  | { kind: "dogs" }
  | { kind: "dog-new" }
  | { kind: "dog-detail"; dogId: string }
  | { kind: "order-new" }
  | { kind: "orders-available" }
  | {
      kind: "order-detail";
      orderId: string;
      view?: "waiting" | "active" | "finish";
    }
  | { kind: "profile" }
  | { kind: "info" }
  | { kind: "chat-example" }
  | { kind: "not-found"; pathname: string };

export function normalizePath(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
}

export function matchRoute(pathname: string): BeltRoute {
  const normalizedPath = normalizePath(pathname);
  const segments = normalizedPath.split("/").filter(Boolean);

  if (normalizedPath === "/" || normalizedPath === "/home") {
    return { kind: "home" };
  }

  if (normalizedPath === "/login") {
    return { kind: "login" };
  }

  if (normalizedPath === "/role") {
    return { kind: "role" };
  }

  if (normalizedPath === "/dogs") {
    return { kind: "dogs" };
  }

  if (normalizedPath === "/dogs/new") {
    return { kind: "dog-new" };
  }

  if (segments[0] === "dogs" && segments[1]) {
    return { kind: "dog-detail", dogId: segments[1] };
  }

  if (normalizedPath === "/orders/new") {
    return { kind: "order-new" };
  }

  if (normalizedPath === "/orders/available") {
    return { kind: "orders-available" };
  }

  if (segments[0] === "orders" && segments[1]) {
    const view = segments[2];
    return {
      kind: "order-detail",
      orderId: segments[1],
      view:
        view === "waiting" || view === "active" || view === "finish"
          ? view
          : undefined,
    };
  }

  if (normalizedPath === "/profile") {
    return { kind: "profile" };
  }

  if (normalizedPath === "/info") {
    return { kind: "info" };
  }

  if (normalizedPath === "/chat-example") {
    return { kind: "chat-example" };
  }

  return { kind: "not-found", pathname: normalizedPath };
}

export function getRouteTitle(route: BeltRoute): string {
  switch (route.kind) {
    case "home":
      return "Home";
    case "login":
      return "Login";
    case "role":
      return "Role";
    case "dogs":
      return "Dogs";
    case "dog-new":
      return "Add dog";
    case "dog-detail":
      return "Dog profile";
    case "order-new":
      return "Create order";
    case "orders-available":
      return "Available walks";
    case "order-detail":
      return "Walk order";
    case "profile":
      return "Profile";
    case "info":
      return "Info";
    case "chat-example":
      return "Chat example";
    case "not-found":
      return "Not found";
  }
}
