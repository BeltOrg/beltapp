import { useCallback } from "react";
import { Link } from "react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import type { BeltOrdersAvailablePageQuery } from "./__generated__/BeltOrdersAvailablePageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import { BeltStatusBadge } from "../components/BeltStatusBadge";
import { useBeltEventsSubscription } from "../realtime/useBeltEventsSubscription";
import {
  prependRecordToRootListIfMissing,
  removeRecordFromRootList,
  replaceRecordInRootList,
} from "../../../shared/relay/store";
import { Card, Surface } from "../../../shared/ui";

const AVAILABLE_ORDER_ADD_EVENTS = new Set(["ORDER_CREATED", "ORDER_UPDATED"]);
const AVAILABLE_ORDER_REMOVE_EVENTS = new Set([
  "ORDER_ACCEPTED",
  "ORDER_CANCELLED",
  "ORDER_STARTED",
  "ORDER_FINISHED",
  "ORDER_PAID",
]);

export function BeltOrdersAvailablePage() {
  const data = useLazyLoadQuery<BeltOrdersAvailablePageQuery>(
    graphql`
      query BeltOrdersAvailablePageQuery {
        availableOrders {
          id
          dogId
          status
          priceAmount
          priceCurrency
          locationAddress
          startTime
        }
      }
    `,
    {},
    { fetchPolicy: "store-and-network" },
  );
  const updateAvailableOrders = useCallback(
    (store: RecordSourceSelectorProxy) => {
      const event = store.getRootField("beltEvent");
      if (!event) {
        return;
      }

      const eventType = event.getValue("type");
      const subjectId = event.getValue("subjectId");
      if (typeof eventType !== "string" || typeof subjectId !== "string") {
        return;
      }

      if (AVAILABLE_ORDER_REMOVE_EVENTS.has(eventType)) {
        removeRecordFromRootList(store, "availableOrders", subjectId);
        return;
      }

      if (!AVAILABLE_ORDER_ADD_EVENTS.has(eventType)) {
        return;
      }

      const order = event.getLinkedRecord("order");
      if (!order) {
        removeRecordFromRootList(store, "availableOrders", subjectId);
        return;
      }

      if (
        order.getValue("status") !== "CREATED" ||
        order.getValue("walkerId") !== null
      ) {
        removeRecordFromRootList(store, "availableOrders", subjectId);
        return;
      }

      replaceRecordInRootList(store, "availableOrders", order);
      prependRecordToRootListIfMissing(store, "availableOrders", order);
    },
    [],
  );

  useBeltEventsSubscription(updateAvailableOrders);

  return (
    <Surface>
      <h2 className="m-0 text-xl font-semibold">Available walks</h2>
      {data.availableOrders.length > 0 ? (
        <ul className="grid gap-3 p-0 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
          {data.availableOrders.map((order) => (
            <Card key={order.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="m-0 text-base font-semibold">
                  {order.locationAddress}
                </h3>
                <BeltStatusBadge status={order.status} />
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Dog</dt>
                  <dd className="m-0 font-semibold">{order.dogId}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Price</dt>
                  <dd className="m-0 font-semibold">
                    {order.priceAmount} {order.priceCurrency}
                  </dd>
                </div>
              </dl>
              <Link
                className="font-semibold text-primary"
                to={`/orders/${order.id}`}
              >
                Open order
              </Link>
            </Card>
          ))}
        </ul>
      ) : (
        <BeltEmptyState
          title="No available walks"
          description="New owner requests will appear here when they are ready."
          action={{ label: "Return home", href: "/home" }}
        />
      )}
    </Surface>
  );
}
