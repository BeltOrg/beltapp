import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppProviders } from "./app/AppProviders";
import { installVitePreloadRecovery } from "./shared/vite/preloadRecovery";

installVitePreloadRecovery();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
