import { useCallback } from "react";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import {
  isUserRole,
  updateAuthSessionUser,
  useAuthSession,
} from "../../../shared/auth/session";
import {
  type BeltEventsSubscriptionResponse,
  useBeltEventsSubscription,
} from "./useBeltEventsSubscription";

type AuthenticatedBeltSessionRealtimeSyncProps = {
  currentUserId: string;
};

function AuthenticatedBeltSessionRealtimeSync({
  currentUserId,
}: AuthenticatedBeltSessionRealtimeSyncProps) {
  const updateCurrentUserRecord = useCallback(
    (store: RecordSourceSelectorProxy) => {
      const event = store.getRootField("beltEvent");
      const user = event?.getLinkedRecord("user");
      if (!user || user.getValue("id") !== currentUserId) {
        return;
      }

      store.getRoot().setLinkedRecord(user, "me");
    },
    [currentUserId],
  );
  const updateCurrentUserSession = useCallback(
    (response: BeltEventsSubscriptionResponse | null | undefined) => {
      const user = response?.beltEvent.user;
      if (!user || user.id !== currentUserId) {
        return;
      }

      updateAuthSessionUser({
        id: user.id,
        phone: user.phone,
        roles: user.roles.filter(isUserRole),
        rating: user.rating,
        isVerified: user.isVerified,
      });
    },
    [currentUserId],
  );

  useBeltEventsSubscription({
    onNext: updateCurrentUserSession,
    updater: updateCurrentUserRecord,
  });

  return null;
}

export function BeltSessionRealtimeSync() {
  const session = useAuthSession();
  if (!session) {
    return null;
  }

  return (
    <AuthenticatedBeltSessionRealtimeSync currentUserId={session.user.id} />
  );
}
