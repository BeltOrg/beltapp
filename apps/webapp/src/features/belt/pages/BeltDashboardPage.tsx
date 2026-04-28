import { useCallback } from "react";
import { Link } from "react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import type { BeltDashboardPageQuery } from "./__generated__/BeltDashboardPageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import { BeltStatusBadge } from "../components/BeltStatusBadge";
import { useBeltEventsSubscription } from "../realtime/useBeltEventsSubscription";
import {
  prependRecordToRootListIfMissing,
  replaceRecordInRootList,
} from "../../../shared/relay/store";
import { Button, Surface } from "../../../shared/ui";

export function BeltDashboardPage() {
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
          status
          startTime
          locationAddress
          walkerId
        }
        myWalkerOrders {
          id
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
  const currentUserId = data.me.id;
  const updateDashboardOrders = useCallback(
    (store: RecordSourceSelectorProxy) => {
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

  const activeOrders = [
    ...data.myOwnerOrders.map((order) => ({ ...order, side: "Owner" })),
    ...data.myWalkerOrders.map((order) => ({ ...order, side: "Walker" })),
  ].filter((order) => order.status !== "PAID" && order.status !== "CANCELLED");
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

      <Surface>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="m-0 text-xl font-semibold">Active walks</h2>
          {primaryWalkAction ? (
            <Button asChild variant="primary">
              <Link to={primaryWalkAction.href}>{primaryWalkAction.label}</Link>
            </Button>
          ) : null}
        </div>
        {activeOrders.length > 0 ? (
          <ul className="grid gap-3 p-0">
            {activeOrders.map((order) => (
              <li
                key={`${order.side}-${order.id}`}
                className="flex items-center justify-between gap-3 rounded-ui border border-border bg-surface p-3"
              >
                <div>
                  <strong className="block">{order.locationAddress}</strong>
                  <span className="text-sm text-muted-foreground">
                    {order.side}
                  </span>
                </div>
                <BeltStatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        ) : (
          <BeltEmptyState
            title="No active walks"
            description="New and accepted walks will appear here."
            action={primaryWalkAction}
          />
        )}
      </Surface>

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
