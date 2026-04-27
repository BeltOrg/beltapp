import {
  MVP_USERS,
  setCurrentMvpUserId,
  useCurrentMvpUser,
} from "../../../shared/auth/mvp-auth";

type BeltRolePageProps = {
  onNavigate: (nextPath: string) => void;
};

export function BeltRolePage({ onNavigate }: BeltRolePageProps) {
  const currentUser = useCurrentMvpUser();

  return (
    <section className="belt-panel">
      <h2>Role</h2>
      <div className="belt-card-grid">
        {MVP_USERS.map((user) => {
          const isSelected = user.id === currentUser.id;

          return (
            <button
              key={user.id}
              type="button"
              className={
                isSelected
                  ? "belt-card belt-card--button belt-card--selected"
                  : "belt-card belt-card--button"
              }
              onClick={() => {
                setCurrentMvpUserId(user.id);
                onNavigate("/home");
              }}
            >
              <strong>{user.label}</strong>
              <span>{user.roles.join(", ")}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
