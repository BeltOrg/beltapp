import { Suspense, lazy } from "react";
import { useCurrentMvpUser } from "../shared/auth/mvp-auth";
import { Button } from "../shared/ui";
import { Navigation } from "./AppNavigation";
import {
  Link,
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useMatches,
  useParams,
  useRouteError,
} from "react-router";

const loadProjectReadmePage = () => import("../components/info/Info");
const Chat = lazy(() => import("../components/chat/Chat"));
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
const ProjectReadmePage = lazy(loadProjectReadmePage);

type RouteHandle = {
  title: string;
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
    <section
      className="rounded-ui border border-border bg-surface p-4"
      role="status"
      aria-live="polite"
    >
      <p>Loading...</p>
    </section>
  );
}

function RouterErrorBoundary() {
  const error = useRouteError();
  const message =
    error instanceof Error ? error.message : "The page could not be loaded.";

  return (
    <section className="grid gap-3 rounded-ui border border-danger/40 bg-danger/10 p-4">
      <p className="text-xs font-bold uppercase text-danger-foreground">
        Route error
      </p>
      <h1 className="m-0 text-2xl font-semibold">Something went wrong.</h1>
      <p className="m-0 max-w-prose text-muted-foreground">{message}</p>
      <Button asChild>
        <Link to="/home">Return home</Link>
      </Button>
    </section>
  );
}

function AppLayout() {
  const currentUser = useCurrentMvpUser();
  const routeTitle = useRouteTitle();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
      <Navigation />
      <main className="grid gap-4" key={currentUser.id}>
        <header className="grid gap-1">
          <p className="m-0 text-xs font-bold uppercase text-muted-foreground">
            Belt
          </p>
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

function InfoRoute() {
  return (
    <Suspense fallback={<RoutePendingState />}>
      <ProjectReadmePage />
    </Suspense>
  );
}

function NotFoundPage() {
  const location = useLocation();

  return (
    <section className="grid gap-3">
      <p className="m-0 text-xs font-bold uppercase text-muted-foreground">
        Page not found
      </p>
      <h2 className="m-0 text-2xl font-semibold">
        Unknown route: {location.pathname}
      </h2>
      <Button asChild>
        <Link to="/home">Return home</Link>
      </Button>
    </section>
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
        element: <DashboardRoute />,
        handle: { title: "Home" } satisfies RouteHandle,
      },
      {
        path: "login",
        element: <LoginRoute />,
        handle: { title: "Login" } satisfies RouteHandle,
      },
      {
        path: "role",
        element: <RoleRoute />,
        handle: { title: "Role" } satisfies RouteHandle,
      },
      {
        path: "dogs",
        element: <DogsRoute />,
        handle: { title: "Dogs" } satisfies RouteHandle,
      },
      {
        path: "dogs/new",
        element: <BeltDogEditorPage mode="create" />,
        handle: { title: "Add dog" } satisfies RouteHandle,
      },
      {
        path: "dogs/:dogId/edit",
        element: <DogEditRoute />,
        handle: { title: "Edit dog" } satisfies RouteHandle,
      },
      {
        path: "dogs/:dogId",
        element: <DogDetailRoute />,
        handle: { title: "Dog profile" } satisfies RouteHandle,
      },
      {
        path: "orders/new",
        element: <BeltOrderEditorPage />,
        handle: { title: "Create order" } satisfies RouteHandle,
      },
      {
        path: "orders/available",
        element: <OrdersAvailableRoute />,
        handle: { title: "Available walks" } satisfies RouteHandle,
      },
      {
        path: "orders/:orderId",
        element: <OrderDetailRoute />,
        handle: { title: "Walk order" } satisfies RouteHandle,
      },
      {
        path: "orders/:orderId/waiting",
        element: <OrderDetailRoute view="waiting" />,
        handle: { title: "Waiting walk" } satisfies RouteHandle,
      },
      {
        path: "orders/:orderId/active",
        element: <OrderDetailRoute view="active" />,
        handle: { title: "Active walk" } satisfies RouteHandle,
      },
      {
        path: "orders/:orderId/finish",
        element: <OrderDetailRoute view="finish" />,
        handle: { title: "Finish walk" } satisfies RouteHandle,
      },
      {
        path: "profile",
        element: <ProfileRoute />,
        handle: { title: "Profile" } satisfies RouteHandle,
      },
      {
        path: "info",
        element: <InfoRoute />,
        handle: { title: "Info" } satisfies RouteHandle,
      },
      {
        path: "chat-example",
        element: <Chat />,
        handle: { title: "Chat example" } satisfies RouteHandle,
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
