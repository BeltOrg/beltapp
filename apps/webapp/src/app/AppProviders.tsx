import { Suspense, useMemo } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import { useCurrentMvpUser } from "../shared/auth/mvp-auth";
import { createRelayEnvironment } from "../shared/relay/environment";
import App from "./App";

export function AppProviders() {
  const currentUser = useCurrentMvpUser();
  const environment = useMemo(
    () => createRelayEnvironment(currentUser.id),
    [currentUser.id],
  );

  return (
    <RelayEnvironmentProvider environment={environment}>
      <Suspense fallback="Loading...">
        <App />
      </Suspense>
    </RelayEnvironmentProvider>
  );
}
