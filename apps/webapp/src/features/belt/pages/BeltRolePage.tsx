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

export function BeltRolePage() {
  const session = useRequiredAuthSession();
  const [roles, setRoles] = useState<UserRole[]>([...session.user.roles]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
    setRoles((currentRoles) => {
      if (currentRoles.includes(role)) {
        const nextRoles = currentRoles.filter((item) => item !== role);
        return nextRoles.length > 0 ? nextRoles : currentRoles;
      }

      return [...currentRoles, role];
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
        updateAuthSessionUser({
          ...response.updateMyRoles,
          roles: response.updateMyRoles.roles.filter(isUserRole),
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
