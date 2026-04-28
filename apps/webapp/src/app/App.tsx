import { Suspense, lazy, type ReactNode } from "react";
import {
  type UserRole,
  useAuthSession,
  userHasAnyRole,
} from "../shared/auth/session";
import { getAuthRedirectPath } from "../shared/auth/redirect";
import { getRelayErrorMessage } from "../shared/relay/errors";
import { ErrorState, PendingState } from "../shared/ui";
import { Navigation } from "./AppNavigation";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useMatches,
  useParams,
  useRouteError,
} from "react-router";

const BeltDashboardPage = lazy(() =>
  import("../features/belt/pages/BeltDashboardPage").then((module) => ({
    default: module.BeltDashboardPage,
  })),
);
const BeltDogDetailPage = lazy(() =>
  import("../features/belt/pages/BeltDogDetailPage").then((module) => ({
    default: module.BeltDogDetailPage,
  })),
);
const BeltDogEditorPage = lazy(() =>
  import("../features/belt/pages/BeltDogEditorPage").then((module) => ({
    default: module.BeltDogEditorPage,
  })),
);
const BeltDogsPage = lazy(() =>
  import("../features/belt/pages/BeltDogsPage").then((module) => ({
    default: module.BeltDogsPage,
  })),
);
const BeltLoginPage = lazy(() =>
  import("../features/belt/pages/BeltLoginPage").then((module) => ({
    default: module.BeltLoginPage,
  })),
);
const BeltOrderDetailPage = lazy(() =>
  import("../features/belt/pages/BeltOrderDetailPage").then((module) => ({
    default: module.BeltOrderDetailPage,
  })),
);
const BeltOrderEditorPage = lazy(() =>
  import("../features/belt/pages/BeltOrderEditorPage").then((module) => ({
    default: module.BeltOrderEditorPage,
  })),
);
const BeltOrdersAvailablePage = lazy(() =>
  import("../features/belt/pages/BeltOrdersAvailablePage").then((module) => ({
    default: module.BeltOrdersAvailablePage,
  })),
);
const BeltProfilePage = lazy(() =>
  import("../features/belt/pages/BeltProfilePage").then((module) => ({
    default: module.BeltProfilePage,
  })),
);
const BeltRolePage = lazy(() =>
  import("../features/belt/pages/BeltRolePage").then((module) => ({
    default: module.BeltRolePage,
  })),
);
type RouteHandle = {
  title: string;
};

type AuthenticatedRouteProps = {
  children: ReactNode;
  roles?: UserRole[];
};

type PublicOnlyRouteProps = {
  children: ReactNode;
};

function isRouteHandle(handle: unknown): handle is RouteHandle {
  if (typeof handle !== "object" || handle === null) {
    return false;
  }

  return typeof (handle as { title?: unknown }).title === "string";
}

function useRouteTitle(): string {
  const matches = useMatches();

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle;
    if (isRouteHandle(handle)) {
      return handle.title;
    }
  }

  return "Belt";
}

function RoutePendingState() {
  return (
    <PendingState
      title="Loading page"
      description="Fetching the latest Belt data."
    />
  );
}

function RouterErrorBoundary() {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? getRelayErrorMessage(error)
      : "The page could not be loaded.";

  return (
    <ErrorState
      eyebrow="Route error"
      message={message}
      action={{ label: "Return home", href: "/home" }}
    />
  );
}

function AuthenticatedRoute({ children, roles }: AuthenticatedRouteProps) {
  const location = useLocation();
  const session = useAuthSession();

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
  }

  if (roles && !userHasAnyRole(session.user, roles)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const location = useLocation();
  const session = useAuthSession();

  if (session) {
    return <Navigate to={getAuthRedirectPath(location.state)} replace />;
  }

  return children;
}

function AppLayout() {
  const session = useAuthSession();
  const routeTitle = useRouteTitle();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
      <Navigation />
      <main className="grid gap-4" key={session?.user.id ?? "anonymous"}>
        <header className="grid gap-1">
          <h1 className="m-0 text-3xl font-semibold leading-tight text-foreground">
            {routeTitle}
          </h1>
        </header>
        <Suspense fallback={<RoutePendingState />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function DashboardRoute() {
  return <BeltDashboardPage />;
}

function LoginRoute() {
  return <BeltLoginPage />;
}

function RoleRoute() {
  return <BeltRolePage />;
}

function DogsRoute() {
  return <BeltDogsPage />;
}

function DogDetailRoute() {
  const { dogId } = useParams();
  if (!dogId) {
    return <Navigate to="/dogs" replace />;
  }

  return <BeltDogDetailPage dogId={dogId} />;
}

function DogEditRoute() {
  const { dogId } = useParams();
  if (!dogId) {
    return <Navigate to="/dogs" replace />;
  }

  return <BeltDogEditorPage dogId={dogId} mode="edit" />;
}

function OrdersAvailableRoute() {
  return <BeltOrdersAvailablePage />;
}

function ProfileRoute() {
  return <BeltProfilePage />;
}

function OrderDetailRoute({
  view,
}: {
  view?: "waiting" | "active" | "finish";
}) {
  const { orderId } = useParams();
  if (!orderId) {
    return <Navigate to="/orders/available" replace />;
  }

  return <BeltOrderDetailPage orderId={orderId} view={view} />;
}

function NotFoundPage() {
  const location = useLocation();

  return (
    <ErrorState
      eyebrow="Page not found"
      title="Unknown route"
      message={location.pathname}
      action={{ label: "Return home", href: "/home" }}
    />
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouterErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />,
      },
      {
        path: "home",
        element: (
          <AuthenticatedRoute>
            <DashboardRoute />
          </AuthenticatedRoute>
        ),
        handle: { title: "Home" } satisfies RouteHandle,
      },
      {
        path: "login",
        element: (
          <PublicOnlyRoute>
            <LoginRoute />
          </PublicOnlyRoute>
        ),
        handle: { title: "Login" } satisfies RouteHandle,
      },
      {
        path: "role",
        element: (
          <AuthenticatedRoute>
            <RoleRoute />
          </AuthenticatedRoute>
        ),
        handle: { title: "Role" } satisfies RouteHandle,
      },
      {
        path: "dogs",
        element: (
          <AuthenticatedRoute roles={["OWNER"]}>
            <DogsRoute />
          </AuthenticatedRoute>
        ),
        handle: { title: "Dogs" } satisfies RouteHandle,
      },
      {
        path: "dogs/new",
        element: (
          <AuthenticatedRoute roles={["OWNER"]}>
            <BeltDogEditorPage mode="create" />
          </AuthenticatedRoute>
        ),
        handle: { title: "Add dog" } satisfies RouteHandle,
      },
      {
        path: "dogs/:dogId/edit",
        element: (
          <AuthenticatedRoute roles={["OWNER"]}>
            <DogEditRoute />
          </AuthenticatedRoute>
        ),
        handle: { title: "Edit dog" } satisfies RouteHandle,
      },
      {
        path: "dogs/:dogId",
        element: (
          <AuthenticatedRoute roles={["OWNER"]}>
            <DogDetailRoute />
          </AuthenticatedRoute>
        ),
        handle: { title: "Dog profile" } satisfies RouteHandle,
      },
      {
        path: "orders/new",
        element: (
          <AuthenticatedRoute roles={["OWNER"]}>
            <BeltOrderEditorPage />
          </AuthenticatedRoute>
        ),
        handle: { title: "Create order" } satisfies RouteHandle,
      },
      {
        path: "orders/available",
        element: (
          <AuthenticatedRoute roles={["WALKER"]}>
            <OrdersAvailableRoute />
          </AuthenticatedRoute>
        ),
        handle: { title: "Available walks" } satisfies RouteHandle,
      },
      {
        path: "orders/:orderId",
        element: (
          <AuthenticatedRoute>
            <OrderDetailRoute />
          </AuthenticatedRoute>
        ),
        handle: { title: "Walk order" } satisfies RouteHandle,
      },
      {
        path: "orders/:orderId/waiting",
        element: (
          <AuthenticatedRoute>
            <OrderDetailRoute view="waiting" />
          </AuthenticatedRoute>
        ),
        handle: { title: "Waiting walk" } satisfies RouteHandle,
      },
      {
        path: "orders/:orderId/active",
        element: (
          <AuthenticatedRoute>
            <OrderDetailRoute view="active" />
          </AuthenticatedRoute>
        ),
        handle: { title: "Active walk" } satisfies RouteHandle,
      },
      {
        path: "orders/:orderId/finish",
        element: (
          <AuthenticatedRoute>
            <OrderDetailRoute view="finish" />
          </AuthenticatedRoute>
        ),
        handle: { title: "Finish walk" } satisfies RouteHandle,
      },
      {
        path: "profile",
        element: (
          <AuthenticatedRoute>
            <ProfileRoute />
          </AuthenticatedRoute>
        ),
        handle: { title: "Profile" } satisfies RouteHandle,
      },
      {
        path: "*",
        element: <NotFoundPage />,
        handle: { title: "Not found" } satisfies RouteHandle,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
