import { useNavigate } from "react-router";
import {
  MVP_USERS,
  setCurrentMvpUserId,
  signInCurrentMvpUser,
  useCurrentMvpUser,
} from "../../../shared/auth/mvp-auth";
import { Surface, cn } from "../../../shared/ui";

export function BeltRolePage() {
  const currentUser = useCurrentMvpUser();
  const navigate = useNavigate();

  return (
    <Surface>
      <h2 className="m-0 text-xl font-semibold">Role</h2>
      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
        {MVP_USERS.map((user) => {
          const isSelected = user.id === currentUser.id;

          return (
            <button
              key={user.id}
              type="button"
              className={cn(
                "grid gap-2 rounded-ui border border-border bg-surface p-4 text-left text-foreground transition-colors hover:border-ring hover:bg-muted",
                isSelected && "border-primary bg-primary/5",
              )}
              onClick={() => {
                setCurrentMvpUserId(user.id);
                signInCurrentMvpUser();
                void navigate("/home");
              }}
            >
              <strong>{user.label}</strong>
              <span className="text-sm text-muted-foreground">
                {user.roles.join(", ")}
              </span>
            </button>
          );
        })}
      </div>
    </Surface>
  );
}
