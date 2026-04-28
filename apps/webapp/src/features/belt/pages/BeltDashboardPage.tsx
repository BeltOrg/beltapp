import { useCallback, useState } from "react";
import { Link } from "react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import type { BeltDashboardPageFinishOrderMutation } from "./__generated__/BeltDashboardPageFinishOrderMutation.graphql";
import type { BeltDashboardPageMarkPaidMutation } from "./__generated__/BeltDashboardPageMarkPaidMutation.graphql";
import type {
  BeltDashboardPageQuery,
  OrderStatus,
} from "./__generated__/BeltDashboardPageQuery.graphql";
import type { BeltDashboardPageStartOrderMutation } from "./__generated__/BeltDashboardPageStartOrderMutation.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import { BeltStatusBadge } from "../components/BeltStatusBadge";
import { applyMyDogsEvent } from "../realtime/dogEvents";
import { useBeltEventsSubscription } from "../realtime/useBeltEventsSubscription";
import {
  prependRecordToRootListIfMissing,
  replaceRecordInRootList,
} from "../../../shared/relay/store";
import { getRelayErrorMessage } from "../../../shared/relay/errors";
import { Alert, Button, Surface } from "../../../shared/ui";

type DashboardOrderSide = "Owner" | "Walker";

type DashboardOrder = {
  id: string;
  locationAddress: string;
  ownerId: string;
  side: DashboardOrderSide;
  startTime: unknown;
  status: OrderStatus;
  walkerId: string | null | undefined;
};

type DashboardOrderMutationAction = "finish" | "mark-paid" | "start";

type DashboardOrderAction =
  | {
      href: string;
      kind: "link";
      label: string;
    }
  | {
      action: DashboardOrderMutationAction;
      inFlightLabel: string;
      kind: "mutation";
      label: string;
    };

type DashboardOrderActionState = {
  action: DashboardOrderMutationAction;
  orderId: string;
};

type DashboardOrderMutationRootField =
  | "finishOrder"
  | "markOrderPaid"
  | "startOrder";

const ACTIVE_ORDER_STATUSES = new Set<OrderStatus>([
  "CREATED",
  "ACCEPTED",
  "STARTED",
]);

const COMPLETED_ORDER_STATUSES = new Set<OrderStatus>(["FINISHED", "PAID"]);

function getDashboardOrderPath(order: DashboardOrder): string {
  if (order.status === "STARTED" && order.side === "Walker") {
    return `/orders/${order.id}/active`;
  }

  if (order.status === "FINISHED") {
    return `/orders/${order.id}/finish`;
  }

  return `/orders/${order.id}`;
}

function getDashboardOrderAction(order: DashboardOrder): DashboardOrderAction {
  switch (order.status) {
    case "ACCEPTED":
      return order.side === "Walker"
        ? {
            action: "start",
            inFlightLabel: "Starting...",
            kind: "mutation",
            label: "Start walk",
          }
        : {
            href: getDashboardOrderPath(order),
            kind: "link",
            label: "View walk",
          };
    case "STARTED":
      return order.side === "Walker"
        ? {
            action: "finish",
            inFlightLabel: "Finishing...",
            kind: "mutation",
            label: "Finish walk",
          }
        : {
            href: getDashboardOrderPath(order),
            kind: "link",
            label: "View active walk",
          };
    case "FINISHED":
      return order.side === "Owner"
        ? {
            action: "mark-paid",
            inFlightLabel: "Marking paid...",
            kind: "mutation",
            label: "Mark paid",
          }
        : {
            href: getDashboardOrderPath(order),
            kind: "link",
            label: "Review walk",
          };
    case "PAID":
      return {
        href: getDashboardOrderPath(order),
        kind: "link",
        label: "View review",
      };
    case "CANCELLED":
    case "CREATED":
    case "%future added value":
      return {
        href: getDashboardOrderPath(order),
        kind: "link",
        label: "View walk",
      };
  }
}

function formatOrderStartTime(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return new Date(value).toLocaleString();
}

function getOrderStartTimestamp(order: DashboardOrder): number {
  if (typeof order.startTime === "number") {
    return order.startTime;
  }

  if (typeof order.startTime !== "string") {
    return 0;
  }

  const timestamp = Date.parse(order.startTime);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

type DashboardOrdersSectionProps = {
  activeAction: DashboardOrderActionState | null;
  action?: { href: string; label: string };
  emptyDescription: string;
  emptyTitle: string;
  onOrderAction: (
    order: DashboardOrder,
    action: DashboardOrderMutationAction,
  ) => void;
  orders: DashboardOrder[];
  title: string;
};

function DashboardOrdersSection({
  activeAction,
  action,
  emptyDescription,
  emptyTitle,
  onOrderAction,
  orders,
  title,
}: DashboardOrdersSectionProps) {
  return (
    <Surface>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="m-0 text-xl font-semibold">{title}</h2>
        {action ? (
          <Button asChild variant="primary">
            <Link to={action.href}>{action.label}</Link>
          </Button>
        ) : null}
      </div>
      {orders.length > 0 ? (
        <ul className="grid gap-3 p-0">
          {orders.map((order) => {
            const orderPath = getDashboardOrderPath(order);
            const orderAction = getDashboardOrderAction(order);
            const isActionInFlight =
              orderAction.kind === "mutation" &&
              activeAction?.orderId === order.id &&
              activeAction.action === orderAction.action;
            const startTimeLabel = formatOrderStartTime(order.startTime);

            return (
              <li
                key={`${order.side}-${order.id}`}
                className="flex flex-col gap-3 rounded-ui border border-border bg-surface p-3 transition-colors hover:border-ring hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
              >
                <Link className="grid min-w-0 flex-1 gap-1" to={orderPath}>
                  <strong className="block truncate text-foreground">
                    {order.locationAddress}
                  </strong>
                  <span className="text-sm text-muted-foreground">
                    {order.side}
                    {startTimeLabel ? ` · ${startTimeLabel}` : ""}
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Link className="inline-flex" to={orderPath}>
                    <BeltStatusBadge status={order.status} />
                  </Link>
                  {orderAction.kind === "link" ? (
                    <Button asChild>
                      <Link to={orderAction.href}>{orderAction.label}</Link>
                    </Button>
                  ) : (
                    <Button
                      disabled={activeAction !== null}
                      onClick={() => onOrderAction(order, orderAction.action)}
                    >
                      {isActionInFlight
                        ? orderAction.inFlightLabel
                        : orderAction.label}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <BeltEmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={action}
        />
      )}
    </Surface>
  );
}

export function BeltDashboardPage() {
  const [activeAction, setActiveAction] =
    useState<DashboardOrderActionState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const data = useLazyLoadQuery<BeltDashboardPageQuery>(
    graphql`
      query BeltDashboardPageQuery {
        me {
          id
          phone
          roles
          rating
        }
        myDogs {
          id
          name
          size
        }
        myOwnerOrders {
          id
          ownerId
          status
          startTime
          locationAddress
          walkerId
        }
        myWalkerOrders {
          id
          walkerId
          status
          startTime
          locationAddress
          ownerId
        }
      }
    `,
    {},
    { fetchPolicy: "store-and-network" },
  );
  const [commitStartOrder] = useMutation<BeltDashboardPageStartOrderMutation>(
    graphql`
      mutation BeltDashboardPageStartOrderMutation($id: ID!) {
        startOrder(id: $id) {
          id
          ownerId
          walkerId
          status
          startTime
          locationAddress
        }
      }
    `,
  );
  const [commitFinishOrder] = useMutation<BeltDashboardPageFinishOrderMutation>(
    graphql`
      mutation BeltDashboardPageFinishOrderMutation($id: ID!) {
        finishOrder(id: $id) {
          id
          ownerId
          walkerId
          status
          startTime
          locationAddress
        }
      }
    `,
  );
  const [commitMarkPaid] = useMutation<BeltDashboardPageMarkPaidMutation>(
    graphql`
      mutation BeltDashboardPageMarkPaidMutation($id: ID!) {
        markOrderPaid(id: $id) {
          id
          ownerId
          walkerId
          status
          startTime
          locationAddress
        }
      }
    `,
  );
  const currentUserId = data.me.id;
  const updateDashboardOrders = useCallback(
    (store: RecordSourceSelectorProxy) => {
      applyMyDogsEvent(store);

      const event = store.getRootField("beltEvent");
      const order = event?.getLinkedRecord("order");
      if (!event || !order) {
        return;
      }

      if (order.getValue("ownerId") === currentUserId) {
        replaceRecordInRootList(store, "myOwnerOrders", order);
        prependRecordToRootListIfMissing(store, "myOwnerOrders", order);
      }

      if (order.getValue("walkerId") === currentUserId) {
        replaceRecordInRootList(store, "myWalkerOrders", order);
        prependRecordToRootListIfMissing(store, "myWalkerOrders", order);
      }
    },
    [currentUserId],
  );

  useBeltEventsSubscription({ updater: updateDashboardOrders });

  const updateCommittedOrder = useCallback(
    (
      store: RecordSourceSelectorProxy,
      rootField: DashboardOrderMutationRootField,
    ) => {
      const order = store.getRootField(rootField);
      if (!order) {
        return;
      }

      replaceRecordInRootList(store, "myOwnerOrders", order);
      replaceRecordInRootList(store, "myWalkerOrders", order);
    },
    [],
  );

  function runOrderAction(
    order: DashboardOrder,
    action: DashboardOrderMutationAction,
  ): void {
    const variables = { id: order.id };
    const onCompleted = () => {
      setActiveAction(null);
    };
    const onError = (error: Error) => {
      setActiveAction(null);
      setActionError(getRelayErrorMessage(error));
    };

    setActionError(null);
    setActiveAction({ action, orderId: order.id });

    switch (action) {
      case "start":
        commitStartOrder({
          variables,
          updater: (store) => updateCommittedOrder(store, "startOrder"),
          onCompleted,
          onError,
        });
        break;
      case "finish":
        commitFinishOrder({
          variables,
          updater: (store) => updateCommittedOrder(store, "finishOrder"),
          onCompleted,
          onError,
        });
        break;
      case "mark-paid":
        commitMarkPaid({
          variables,
          updater: (store) => updateCommittedOrder(store, "markOrderPaid"),
          onCompleted,
          onError,
        });
        break;
    }
  }

  const orders: DashboardOrder[] = [
    ...data.myOwnerOrders.map((order) => ({
      ...order,
      side: "Owner" as const,
    })),
    ...data.myWalkerOrders.map((order) => ({
      ...order,
      side: "Walker" as const,
    })),
  ].sort((leftOrder, rightOrder) => {
    return (
      getOrderStartTimestamp(rightOrder) - getOrderStartTimestamp(leftOrder)
    );
  });
  const activeOrders = orders.filter((order) =>
    ACTIVE_ORDER_STATUSES.has(order.status),
  );
  const completedOrders = orders.filter((order) =>
    COMPLETED_ORDER_STATUSES.has(order.status),
  );
  const isOwner = data.me.roles.includes("OWNER");
  const isWalker = data.me.roles.includes("WALKER");
  const primaryWalkAction = isOwner
    ? { label: "New walk", href: "/orders/new" }
    : isWalker
      ? { label: "Find walks", href: "/orders/available" }
      : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
      <Surface
        framed
        className="lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
      >
        <div>
          <p className="m-0 text-xs font-bold uppercase text-muted-foreground">
            Current session
          </p>
          <h2 className="m-0 text-xl font-semibold">{data.me.phone}</h2>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Roles</dt>
            <dd className="m-0 font-semibold">{data.me.roles.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dogs</dt>
            <dd className="m-0 font-semibold">{data.myDogs.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rating</dt>
            <dd className="m-0 font-semibold">{data.me.rating.toFixed(1)}</dd>
          </div>
        </dl>
      </Surface>

      {actionError ? (
        <Alert className="lg:col-span-2">{actionError}</Alert>
      ) : null}

      <div className={isOwner ? "grid gap-4" : "grid gap-4 lg:col-span-2"}>
        <DashboardOrdersSection
          title="Active walks"
          orders={activeOrders}
          emptyTitle="No active walks"
          emptyDescription="New and accepted walks will appear here."
          action={primaryWalkAction}
          activeAction={activeAction}
          onOrderAction={runOrderAction}
        />
        <DashboardOrdersSection
          title="Completed walks"
          orders={completedOrders}
          emptyTitle="No completed walks"
          emptyDescription="Finished and paid walks will stay available here."
          activeAction={activeAction}
          onOrderAction={runOrderAction}
        />
      </div>

      {isOwner ? (
        <Surface>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="m-0 text-xl font-semibold">Dogs</h2>
            <Link className="font-semibold text-primary" to="/dogs">
              View all
            </Link>
          </div>
          {data.myDogs.length > 0 ? (
            <ul className="grid gap-3 p-0">
              {data.myDogs.slice(0, 4).map((dog) => (
                <li
                  key={dog.id}
                  className="rounded-ui border border-border bg-surface p-3"
                >
                  <div>
                    <strong className="block">{dog.name}</strong>
                    <span className="text-sm text-muted-foreground">
                      {dog.size}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <BeltEmptyState
              title="No dogs yet"
              description="Add a dog profile before creating a walk."
              action={{ label: "Add dog", href: "/dogs/new" }}
            />
          )}
        </Surface>
      ) : null}
    </div>
  );
}
