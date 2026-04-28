import { Link, NavLink, useNavigate } from "react-router";
import {
  type UserRole,
  useAuthSession,
  userHasAnyRole,
} from "../shared/auth/session";
import { cn } from "../shared/ui";
import { NotificationsBell } from "../features/notifications/NotificationsBell";

type PrimaryLink = {
  to: string;
  label: string;
  end: boolean;
  roles?: UserRole[];
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
  const session = useAuthSession();
  const navigate = useNavigate();
  const visibleLinks = session
    ? PRIMARY_LINKS.filter(
        (link) => !link.roles || userHasAnyRole(session.user, link.roles),
      )
    : [{ to: "/login", label: "Login", end: true }];

  return (
    <nav
      className="flex flex-col gap-3 py-1 md:flex-row md:items-center md:justify-between"
      aria-label="Primary"
    >
      <Link
        to="/home"
        className="inline-flex items-center gap-2 text-lg font-bold tracking-normal text-foreground"
      >
        <img
          src="/belt-logo.png"
          alt=""
          className="size-10 shrink-0 object-contain"
          aria-hidden="true"
        />
        <span>Belt</span>
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
      {session ? (
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <button
            type="button"
            className="rounded-ui border border-border bg-surface px-3 py-2 text-left text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-ring hover:bg-muted"
            onClick={() => void navigate("/profile")}
          >
            {session.user.phone}
          </button>
        </div>
      ) : null}
    </nav>
  );
}
