import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltOrdersAvailablePageQuery } from "./__generated__/BeltOrdersAvailablePageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import { BeltStatusBadge } from "../components/BeltStatusBadge";

type BeltOrdersAvailablePageProps = {
  onNavigate: (nextPath: string) => void;
};

export function BeltOrdersAvailablePage({
  onNavigate,
}: BeltOrdersAvailablePageProps) {
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
    { fetchPolicy: "network-only" },
  );

  return (
    <section className="belt-panel">
      <h2>Available walks</h2>
      {data.availableOrders.length > 0 ? (
        <ul className="belt-card-grid">
          {data.availableOrders.map((order) => (
            <li key={order.id} className="belt-card">
              <div className="belt-card__header">
                <h3>{order.locationAddress}</h3>
                <BeltStatusBadge status={order.status} />
              </div>
              <dl className="belt-inline-facts">
                <div>
                  <dt>Dog</dt>
                  <dd>{order.dogId}</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>
                    {order.priceAmount} {order.priceCurrency}
                  </dd>
                </div>
              </dl>
              <a
                href={`/orders/${order.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(`/orders/${order.id}`);
                }}
              >
                Open order
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <BeltEmptyState title="No available walks" />
      )}
    </section>
  );
}
