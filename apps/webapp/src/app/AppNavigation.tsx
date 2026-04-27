import type { MouseEvent } from "react";
import {
  MVP_USERS,
  setCurrentMvpUserId,
  useCurrentMvpUser,
} from "../shared/auth/mvp-auth";

type NavigationProps = {
  currentPath: string;
  onNavigate: (nextPath: string) => void;
  onNavigateIntent?: (nextPath: string) => void;
};

const PRIMARY_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/dogs", label: "Dogs" },
  { href: "/orders/new", label: "New walk" },
  { href: "/orders/available", label: "Available" },
  { href: "/profile", label: "Profile" },
];

function isActivePath(currentPath: string, href: string): boolean {
  if (href === "/home") {
    return currentPath === "/" || currentPath === "/home";
  }

  if (href === "/dogs") {
    return currentPath === "/dogs" || currentPath.startsWith("/dogs/");
  }

  if (href === "/orders/available") {
    return currentPath === href;
  }

  if (href === "/orders/new") {
    return currentPath === href;
  }

  return currentPath === href;
}

function NavigationLink({
  href,
  label,
  currentPath,
  onNavigate,
  onNavigateIntent,
}: {
  href: string;
  label: string;
  currentPath: string;
  onNavigate: (nextPath: string) => void;
  onNavigateIntent?: (nextPath: string) => void;
}) {
  const isActive = isActivePath(currentPath, href);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate(href);
  }

  function handleIntent() {
    onNavigateIntent?.(href);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      onMouseEnter={handleIntent}
      onFocus={handleIntent}
      className={
        isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"
      }
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </a>
  );
}

export function Navigation({
  currentPath,
  onNavigate,
  onNavigateIntent,
}: NavigationProps) {
  const currentUser = useCurrentMvpUser();

  return (
    <nav className="app-nav" aria-label="Primary">
      <a
        href="/home"
        className="app-nav__brand"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("/home");
        }}
      >
        Belt
      </a>
      <div className="app-nav__links">
        {PRIMARY_LINKS.map((link) => (
          <NavigationLink
            key={link.href}
            href={link.href}
            label={link.label}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onNavigateIntent={onNavigateIntent}
          />
        ))}
      </div>
      <label className="app-nav__user">
        <span>Session</span>
        <select
          value={currentUser.id}
          onChange={(event) => {
            setCurrentMvpUserId(Number(event.target.value));
            onNavigate("/home");
          }}
        >
          {MVP_USERS.map((user) => (
            <option key={user.id} value={user.id}>
              {user.label}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
