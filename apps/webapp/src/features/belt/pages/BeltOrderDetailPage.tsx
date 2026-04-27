import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltOrderDetailPageQuery } from "./__generated__/BeltOrderDetailPageQuery.graphql";
import { BeltStatusBadge } from "../components/BeltStatusBadge";

type BeltOrderDetailPageProps = {
  orderId: string;
  view?: "waiting" | "active" | "finish";
};

export function BeltOrderDetailPage({
  orderId,
  view,
}: BeltOrderDetailPageProps) {
  const data = useLazyLoadQuery<BeltOrderDetailPageQuery>(
    graphql`
      query BeltOrderDetailPageQuery($id: ID!) {
        order(id: $id) {
          id
          ownerId
          walkerId
          dogId
          status
          priceAmount
          priceCurrency
          locationAddress
          startTime
          endTime
          acceptedAt
          startedAt
          finishedAt
          paidAt
        }
      }
    `,
    { id: orderId },
    { fetchPolicy: "network-only" },
  );

  return (
    <section className="belt-panel">
      <div className="belt-detail-header">
        <div>
          <p className="belt-eyebrow">
            {view ? `${view} view` : "Order detail"}
          </p>
          <h2>{data.order.locationAddress}</h2>
        </div>
        <BeltStatusBadge status={data.order.status} />
      </div>
      <dl className="belt-detail-list">
        <div>
          <dt>Dog</dt>
          <dd>{data.order.dogId}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{data.order.ownerId}</dd>
        </div>
        <div>
          <dt>Walker</dt>
          <dd>{data.order.walkerId ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>
            {data.order.priceAmount} {data.order.priceCurrency}
          </dd>
        </div>
      </dl>
      <div className="belt-action-row">
        <button type="button" className="belt-button belt-button--primary">
          Accept
        </button>
        <button type="button" className="belt-button">
          Start
        </button>
        <button type="button" className="belt-button">
          Finish
        </button>
      </div>
    </section>
  );
}
