import { Link, NavLink, useNavigate } from "react-router";
import {
  MVP_USERS,
  type MvpUserRole,
  setCurrentMvpUserId,
  useIsCurrentMvpUserAuthenticated,
  useCurrentMvpUser,
  userHasAnyRole,
} from "../shared/auth/mvp-auth";
import { cn } from "../shared/ui";

type PrimaryLink = {
  to: string;
  label: string;
  end: boolean;
  roles?: MvpUserRole[];
};

const PRIMARY_LINKS: PrimaryLink[] = [
  { to: "/home", label: "Home", end: true },
  { to: "/role", label: "Role", end: true },
  { to: "/dogs", label: "Dogs", end: false, roles: ["OWNER"] },
  { to: "/orders/new", label: "New walk", end: true, roles: ["OWNER"] },
  {
    to: "/orders/available",
    label: "Available",
    end: true,
    roles: ["WALKER"],
  },
  { to: "/profile", label: "Profile", end: true },
];

export function Navigation() {
  const currentUser = useCurrentMvpUser();
  const isAuthenticated = useIsCurrentMvpUserAuthenticated();
  const navigate = useNavigate();
  const visibleLinks = isAuthenticated
    ? PRIMARY_LINKS.filter(
        (link) => !link.roles || userHasAnyRole(currentUser, link.roles),
      )
    : [{ to: "/login", label: "Login", end: true }];

  return (
    <nav
      className="flex flex-col gap-3 py-1 md:flex-row md:items-center md:justify-between"
      aria-label="Primary"
    >
      <Link
        to="/home"
        className="text-lg font-bold tracking-normal text-foreground"
      >
        Belt
      </Link>
      <div className="flex flex-wrap gap-1">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                "rounded-ui border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive &&
                  "border-border bg-surface text-foreground shadow-sm",
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      {isAuthenticated ? (
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground sm:min-w-40">
          <span>Session</span>
          <select
            className="rounded-ui border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            value={currentUser.id}
            onChange={(event) => {
              setCurrentMvpUserId(Number(event.target.value));
              void navigate("/home");
            }}
          >
            {MVP_USERS.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </nav>
  );
}
