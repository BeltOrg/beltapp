import { useState } from "react";
import { graphql, useMutation } from "react-relay";
import type { BeltRolePageUpdateMyRolesMutation } from "./__generated__/BeltRolePageUpdateMyRolesMutation.graphql";
import {
  type UserRole,
  isUserRole,
  updateAuthSessionUser,
  useRequiredAuthSession,
} from "../../../shared/auth/session";
import { getRelayErrorMessage } from "../../../shared/relay/errors";
import { Alert, Button, Surface, cn } from "../../../shared/ui";

const ROLE_OPTIONS: Array<{ label: string; value: UserRole }> = [
  { label: "Owner", value: "OWNER" },
  { label: "Walker", value: "WALKER" },
];

function normalizeRoles(roles: ReadonlyArray<UserRole>): UserRole[] {
  return ROLE_OPTIONS.map((role) => role.value).filter((role) =>
    roles.includes(role),
  );
}

function getRolesKey(roles: ReadonlyArray<UserRole>): string {
  return normalizeRoles(roles).join("|");
}

type RolesDraft = {
  baselineKey: string;
  roles: UserRole[];
};

export function BeltRolePage() {
  const session = useRequiredAuthSession();
  const sessionRolesKey = getRolesKey(session.user.roles);
  const sessionRoles = normalizeRoles(session.user.roles);
  const [draft, setDraft] = useState<RolesDraft>(() => ({
    baselineKey: sessionRolesKey,
    roles: sessionRoles,
  }));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const draftRolesKey = getRolesKey(draft.roles);
  const isDirty = draftRolesKey !== draft.baselineKey;
  const roles = isDirty ? draft.roles : sessionRoles;
  const showSessionRoleChange =
    isDirty &&
    sessionRolesKey !== draft.baselineKey &&
    draftRolesKey !== sessionRolesKey;
  const [commitUpdateRoles] = useMutation<BeltRolePageUpdateMyRolesMutation>(
    graphql`
      mutation BeltRolePageUpdateMyRolesMutation($input: UpdateMyRolesInput!) {
        updateMyRoles(input: $input) {
          id
          phone
          roles
          rating
          isVerified
        }
      }
    `,
  );

  function toggleRole(role: UserRole): void {
    const nextRoles = roles.includes(role)
      ? roles.filter((item) => item !== role)
      : [...roles, role];

    if (nextRoles.length === 0) {
      return;
    }

    setDraft({
      baselineKey: sessionRolesKey,
      roles: normalizeRoles(nextRoles),
    });
  }

  function applyLatestRoles(): void {
    setDraft({
      baselineKey: sessionRolesKey,
      roles: sessionRoles,
    });
  }

  function saveRoles(): void {
    setError(null);
    setIsSaving(true);
    commitUpdateRoles({
      variables: {
        input: {
          roles,
        },
      },
      onCompleted: (response) => {
        const savedRoles = response.updateMyRoles.roles.filter(isUserRole);
        const normalizedSavedRoles = normalizeRoles(savedRoles);
        updateAuthSessionUser({
          ...response.updateMyRoles,
          roles: normalizedSavedRoles,
        });
        setDraft({
          baselineKey: getRolesKey(normalizedSavedRoles),
          roles: normalizedSavedRoles,
        });
        setIsSaving(false);
      },
      onError: (relayError) => {
        setError(getRelayErrorMessage(relayError));
        setIsSaving(false);
      },
    });
  }

  return (
    <Surface>
      <h2 className="m-0 text-xl font-semibold">Role</h2>
      {error ? <Alert>{error}</Alert> : null}
      {showSessionRoleChange ? (
        <Alert className="grid gap-2" role="status" tone="info">
          <span>
            Roles changed in another tab. Apply the latest roles or save your
            current selection.
          </span>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} onClick={applyLatestRoles}>
              Apply latest roles
            </Button>
          </div>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
        {ROLE_OPTIONS.map((role) => {
          const isSelected = roles.includes(role.value);

          return (
            <button
              key={role.value}
              type="button"
              className={cn(
                "grid gap-2 rounded-ui border border-border bg-surface p-4 text-left text-foreground transition-colors hover:border-ring hover:bg-muted",
                isSelected && "border-primary bg-primary/5",
              )}
              disabled={isSaving}
              onClick={() => toggleRole(role.value)}
            >
              <strong>{role.label}</strong>
              <span className="text-sm text-muted-foreground">
                {isSelected ? "Enabled" : "Disabled"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={isSaving} onClick={saveRoles}>
          {isSaving ? "Saving..." : "Save roles"}
        </Button>
      </div>
    </Surface>
  );
}
