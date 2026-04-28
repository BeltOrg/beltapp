import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  graphql,
  useLazyLoadQuery,
  useMutation,
  useSubscription,
} from "react-relay";
import type {
  GraphQLSubscriptionConfig,
  RecordProxy,
  RecordSourceSelectorProxy,
} from "relay-runtime";
import type { NotificationsBellMarkAllReadMutation } from "./__generated__/NotificationsBellMarkAllReadMutation.graphql";
import type { NotificationsBellMarkReadMutation } from "./__generated__/NotificationsBellMarkReadMutation.graphql";
import type { NotificationsBellQuery } from "./__generated__/NotificationsBellQuery.graphql";
import type { NotificationsBellSubscription } from "./__generated__/NotificationsBellSubscription.graphql";
import { Button, cn } from "../../shared/ui";

const NOTIFICATION_LIMIT = 10;
const NOTIFICATION_LIST_ARGS = { limit: NOTIFICATION_LIMIT };

type NotificationRecord =
  NotificationsBellQuery["response"]["myNotifications"][number];

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function getNotificationId(record: RecordProxy): string {
  const id = record.getValue("id");
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : record.getDataID();
}

function getNotificationRecords(
  store: RecordSourceSelectorProxy,
): RecordProxy[] {
  return (
    store
      .getRoot()
      .getLinkedRecords("myNotifications", NOTIFICATION_LIST_ARGS) ?? []
  );
}

function setNotificationRecords(
  store: RecordSourceSelectorProxy,
  records: RecordProxy[],
): void {
  store
    .getRoot()
    .setLinkedRecords(records, "myNotifications", NOTIFICATION_LIST_ARGS);
}

function incrementUnreadCount(store: RecordSourceSelectorProxy): void {
  const root = store.getRoot();
  const currentCount = root.getValue("myUnreadNotificationCount");
  root.setValue(
    typeof currentCount === "number" ? currentCount + 1 : 1,
    "myUnreadNotificationCount",
  );
}

function decrementUnreadCount(store: RecordSourceSelectorProxy): void {
  const root = store.getRoot();
  const currentCount = root.getValue("myUnreadNotificationCount");
  root.setValue(
    typeof currentCount === "number" ? Math.max(0, currentCount - 1) : 0,
    "myUnreadNotificationCount",
  );
}

function prependNotificationIfMissing(
  store: RecordSourceSelectorProxy,
  notification: RecordProxy,
): boolean {
  const existingRecords = getNotificationRecords(store);
  const notificationId = getNotificationId(notification);

  if (
    existingRecords.some(
      (record) => getNotificationId(record) === notificationId,
    )
  ) {
    return false;
  }

  setNotificationRecords(
    store,
    [notification, ...existingRecords].slice(0, NOTIFICATION_LIMIT),
  );
  return true;
}

function markAllRootNotificationsRead(store: RecordSourceSelectorProxy): void {
  const readAt = Date.now();
  for (const notification of getNotificationRecords(store)) {
    notification.setValue(readAt, "readAt");
  }
  store.getRoot().setValue(0, "myUnreadNotificationCount");
}

function formatNotificationTime(value: unknown): string {
  const timestamp =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Date.parse(value)
        : Number.NaN;

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return new Date(timestamp).toLocaleString();
}

function useNotificationCreatedSubscription(): void {
  const subscriptionConfig = useMemo<
    GraphQLSubscriptionConfig<NotificationsBellSubscription>
  >(
    () => ({
      subscription: graphql`
        subscription NotificationsBellSubscription {
          notificationCreated {
            id
            recipientId
            type
            title
            body
            actionUrl
            orderId
            actorId
            readAt
            createdAt
          }
        }
      `,
      variables: {},
      updater: (store) => {
        const notification = store.getRootField("notificationCreated");
        if (!notification) {
          return;
        }

        if (prependNotificationIfMissing(store, notification)) {
          incrementUnreadCount(store);
        }
      },
    }),
    [],
  );

  useSubscription<NotificationsBellSubscription>(subscriptionConfig);
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const data = useLazyLoadQuery<NotificationsBellQuery>(
    graphql`
      query NotificationsBellQuery($limit: Int!) {
        myUnreadNotificationCount
        myNotifications(limit: $limit) {
          id
          recipientId
          type
          title
          body
          actionUrl
          orderId
          actorId
          readAt
          createdAt
        }
      }
    `,
    { limit: NOTIFICATION_LIMIT },
    { fetchPolicy: "store-and-network" },
  );
  const [commitMarkRead] = useMutation<NotificationsBellMarkReadMutation>(
    graphql`
      mutation NotificationsBellMarkReadMutation($id: ID!) {
        markNotificationRead(id: $id) {
          id
          readAt
        }
      }
    `,
  );
  const [commitMarkAllRead, isMarkingAllRead] =
    useMutation<NotificationsBellMarkAllReadMutation>(graphql`
      mutation NotificationsBellMarkAllReadMutation {
        markAllNotificationsRead
      }
    `);

  useNotificationCreatedSubscription();

  const notifications = data.myNotifications.filter(Boolean);
  const unreadCount = data.myUnreadNotificationCount;

  function openNotification(notification: NotificationRecord): void {
    setIsOpen(false);

    if (!notification.readAt) {
      commitMarkRead({
        variables: { id: notification.id },
        updater: (store) => decrementUnreadCount(store),
      });
    }

    if (notification.actionUrl) {
      void navigate(notification.actionUrl);
    }
  }

  function markAllRead(): void {
    commitMarkAllRead({
      variables: {},
      updater: markAllRootNotificationsRead,
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex size-10 items-center justify-center rounded-ui border border-border bg-surface text-foreground shadow-sm transition-colors hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[0.7rem] font-bold leading-none text-danger-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section className="fixed left-4 right-4 top-20 z-20 grid gap-2 rounded-ui border border-border bg-surface p-3 text-surface-foreground shadow-lg md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-[min(22rem,calc(100vw-2rem))]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-base font-semibold">Notifications</h2>
            {unreadCount > 0 ? (
              <Button
                className="min-h-8 px-2 py-1 text-xs"
                disabled={isMarkingAllRead}
                onClick={markAllRead}
                variant="ghost"
              >
                Mark read
              </Button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="m-0 rounded-ui border border-dashed border-border bg-muted p-3 text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="m-0 grid max-h-[26rem] gap-1 overflow-auto p-0">
              {notifications.map((notification) => (
                <li className="list-none" key={notification.id}>
                  <button
                    type="button"
                    className={cn(
                      "grid w-full gap-1 rounded-ui border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-muted",
                      !notification.readAt && "bg-info/60",
                    )}
                    onClick={() => openNotification(notification)}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {notification.title}
                      </span>
                      {!notification.readAt ? (
                        <span
                          className="mt-1 size-2 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      ) : null}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {notification.body}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
