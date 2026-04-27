import {
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Chat from "../components/chat/Chat";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";
import { BeltDashboardPage } from "../features/belt/pages/BeltDashboardPage";
import { BeltDogDetailPage } from "../features/belt/pages/BeltDogDetailPage";
import { BeltDogEditorPage } from "../features/belt/pages/BeltDogEditorPage";
import { BeltDogsPage } from "../features/belt/pages/BeltDogsPage";
import { BeltLoginPage } from "../features/belt/pages/BeltLoginPage";
import { BeltOrderDetailPage } from "../features/belt/pages/BeltOrderDetailPage";
import { BeltOrderEditorPage } from "../features/belt/pages/BeltOrderEditorPage";
import { BeltOrdersAvailablePage } from "../features/belt/pages/BeltOrdersAvailablePage";
import { BeltProfilePage } from "../features/belt/pages/BeltProfilePage";
import { BeltRolePage } from "../features/belt/pages/BeltRolePage";
import { useCurrentMvpUser } from "../shared/auth/mvp-auth";
import { Navigation } from "./AppNavigation";
import { getRouteTitle, matchRoute, normalizePath } from "./routes";
import "./App.css";

const loadProjectReadmePage = () => import("../components/info/Info");
const ProjectReadmePage = lazy(loadProjectReadmePage);

function preloadRoute(pathname: string) {
  if (pathname === "/info") {
    void loadProjectReadmePage();
  }
}

function usePathname() {
  const [pathname, setPathname] = useState(() =>
    normalizePath(window.location.pathname),
  );

  useEffect(() => {
    function syncPathname() {
      const nextPath = normalizePath(window.location.pathname);
      preloadRoute(nextPath);
      startTransition(() => {
        setPathname(nextPath);
      });
    }

    window.addEventListener("popstate", syncPathname);

    return () => {
      window.removeEventListener("popstate", syncPathname);
    };
  }, []);

  function navigate(nextPath: string) {
    const normalizedNextPath = normalizePath(nextPath);
    if (normalizedNextPath === pathname) {
      return;
    }

    preloadRoute(normalizedNextPath);
    window.history.pushState({}, "", normalizedNextPath);
    startTransition(() => {
      setPathname(normalizedNextPath);
    });
  }

  return { pathname, navigate };
}

function RoutePendingState({ pathname }: { pathname: string }) {
  if (pathname === "/info") {
    return (
      <section className="route-pending" role="status" aria-live="polite">
        <p className="info-page__eyebrow">Loading docs</p>
        <h1>Preparing the project guide.</h1>
      </section>
    );
  }

  return (
    <section className="route-pending" role="status" aria-live="polite">
      <p>Loading...</p>
    </section>
  );
}

function NotFoundPage({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: (nextPath: string) => void;
}) {
  return (
    <section className="not-found">
      <p className="belt-eyebrow">Page not found</p>
      <h1>Unknown route: {pathname}</h1>
      <p>
        <a
          href="/home"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/home");
          }}
        >
          Return home
        </a>
      </p>
    </section>
  );
}

export default function App() {
  const { pathname, navigate } = usePathname();
  const currentUser = useCurrentMvpUser();
  const route = matchRoute(pathname);
  let content: ReactNode;

  switch (route.kind) {
    case "home":
      content = <BeltDashboardPage onNavigate={navigate} />;
      break;
    case "login":
      content = <BeltLoginPage onNavigate={navigate} />;
      break;
    case "role":
      content = <BeltRolePage onNavigate={navigate} />;
      break;
    case "dogs":
      content = <BeltDogsPage onNavigate={navigate} />;
      break;
    case "dog-new":
      content = <BeltDogEditorPage mode="create" />;
      break;
    case "dog-detail":
      content = <BeltDogDetailPage dogId={route.dogId} />;
      break;
    case "order-new":
      content = <BeltOrderEditorPage />;
      break;
    case "orders-available":
      content = <BeltOrdersAvailablePage onNavigate={navigate} />;
      break;
    case "order-detail":
      content = (
        <BeltOrderDetailPage orderId={route.orderId} view={route.view} />
      );
      break;
    case "profile":
      content = <BeltProfilePage onNavigate={navigate} />;
      break;
    case "info":
      content = (
        <RouteErrorBoundary pathname={pathname}>
          <Suspense fallback={<RoutePendingState pathname={pathname} />}>
            <ProjectReadmePage />
          </Suspense>
        </RouteErrorBoundary>
      );
      break;
    case "chat-example":
      content = <Chat />;
      break;
    case "not-found":
      content = (
        <NotFoundPage pathname={route.pathname} onNavigate={navigate} />
      );
      break;
  }

  return (
    <div className="app-shell">
      <Navigation
        currentPath={pathname}
        onNavigate={navigate}
        onNavigateIntent={preloadRoute}
      />
      <main className="app-main" key={`${currentUser.id}:${pathname}`}>
        <header className="app-route-header">
          <p className="belt-eyebrow">Belt</p>
          <h1>{getRouteTitle(route)}</h1>
        </header>
        {content}
      </main>
    </div>
  );
}
