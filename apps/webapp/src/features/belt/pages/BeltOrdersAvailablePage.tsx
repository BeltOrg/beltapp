import { Link } from "react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltOrdersAvailablePageQuery } from "./__generated__/BeltOrdersAvailablePageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import { BeltStatusBadge } from "../components/BeltStatusBadge";
import { Card, Surface } from "../../../shared/ui";

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
