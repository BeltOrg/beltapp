import { useSyncExternalStore } from "react";

export type MvpUserRole = "OWNER" | "WALKER";

export type MvpUser = {
  id: number;
  label: string;
  phone: string;
  roles: MvpUserRole[];
};

const STORAGE_KEY = "belt:mvp-user-id";
const listeners = new Set<() => void>();

export const MVP_USERS: MvpUser[] = [
  {
    id: 1,
    label: "Owner",
    phone: "+3725550001",
    roles: ["OWNER"],
  },
  {
    id: 2,
    label: "Walker",
    phone: "+3725550002",
    roles: ["WALKER"],
  },
  {
    id: 3,
    label: "Owner + walker",
    phone: "+3725550003",
    roles: ["OWNER", "WALKER"],
  },
];

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function readStoredUserId(): number {
  if (typeof window === "undefined") {
    return MVP_USERS[0].id;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : NaN;

  return MVP_USERS.some((user) => user.id === parsedValue)
    ? parsedValue
    : MVP_USERS[0].id;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentMvpUserId(): number {
  return readStoredUserId();
}

export function getCurrentMvpUser(): MvpUser {
  const userId = getCurrentMvpUserId();
  return MVP_USERS.find((user) => user.id === userId) ?? MVP_USERS[0];
}

export function setCurrentMvpUserId(userId: number): void {
  if (!MVP_USERS.some((user) => user.id === userId)) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, String(userId));
  emitChange();
}

export function useCurrentMvpUser(): MvpUser {
  return useSyncExternalStore(subscribe, getCurrentMvpUser, getCurrentMvpUser);
}
