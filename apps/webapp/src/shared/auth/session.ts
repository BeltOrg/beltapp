import { useSyncExternalStore } from "react";

export type UserRole = "OWNER" | "WALKER";

export type AuthenticatedUser = {
  id: string;
  phone: string;
  roles: ReadonlyArray<UserRole>;
  rating: number;
  isVerified: boolean;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthenticatedUser;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
};

const STORAGE_KEY = "belt:auth-session";
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "OWNER" || value === "WALKER";
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const user = value as AuthenticatedUser;
  return (
    typeof user.id === "string" &&
    typeof user.phone === "string" &&
    Array.isArray(user.roles) &&
    user.roles.every(isUserRole) &&
    typeof user.rating === "number" &&
    typeof user.isVerified === "boolean"
  );
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as AuthSession;
  return (
    typeof session.accessToken === "string" &&
    typeof session.refreshToken === "string" &&
    typeof session.expiresAt === "number" &&
    isAuthenticatedUser(session.user)
  );
}

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return isAuthSession(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    emitChange();
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emitChange();
}

export function getAuthSession(): AuthSession | null {
  return readStoredSession();
}

export function getAccessToken(): string | null {
  return getAuthSession()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return getAuthSession()?.refreshToken ?? null;
}

export function setAuthSessionFromPayload(payload: AuthPayload): AuthSession {
  const session: AuthSession = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresAt: Date.now() + payload.expiresIn * 1000,
    user: payload.user,
  };

  writeStoredSession(session);
  return session;
}

export function updateAuthSessionUser(user: AuthenticatedUser): void {
  const session = getAuthSession();
  if (!session) {
    return;
  }

  writeStoredSession({
    ...session,
    user,
  });
}

export function clearAuthSession(): void {
  writeStoredSession(null);
}

export function userHasAnyRole(
  user: AuthenticatedUser,
  roles: UserRole[],
): boolean {
  return roles.some((role) => user.roles.includes(role));
}

export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(subscribe, getAuthSession, getAuthSession);
}

export function useRequiredAuthSession(): AuthSession {
  const session = useAuthSession();

  if (!session) {
    throw new Error("Authenticated session is required.");
  }

  return session;
}
