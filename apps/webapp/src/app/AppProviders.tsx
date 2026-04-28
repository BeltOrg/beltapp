import { Suspense, useMemo } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import { useAuthSession } from "../shared/auth/session";
import { createRelayEnvironment } from "../shared/relay/environment";
import { PendingState } from "../shared/ui";
import App from "./App";

export function AppProviders() {
  const session = useAuthSession();
  const environment = useMemo(
    () => createRelayEnvironment(session?.user.id),
    [session?.user.id],
  );

  return (
    <RelayEnvironmentProvider environment={environment}>
      <Suspense
        fallback={
          <main className="mx-auto grid min-h-screen w-full max-w-7xl place-items-center px-4 py-5 sm:px-6">
            <PendingState title="Loading Belt" />
          </main>
        }
      >
        <App />
      </Suspense>
    </RelayEnvironmentProvider>
  );
}
