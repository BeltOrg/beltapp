import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app/App.tsx";
import { RelayEnvironmentProvider } from "react-relay";
import { createRelayEnvironment } from "./shared/relay/environment";
import { installVitePreloadRecovery } from "./shared/vite/preloadRecovery";

const environment = createRelayEnvironment();
installVitePreloadRecovery();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RelayEnvironmentProvider environment={environment}>
      <Suspense fallback="Loading...">
        <App />
      </Suspense>
    </RelayEnvironmentProvider>
  </StrictMode>,
);
