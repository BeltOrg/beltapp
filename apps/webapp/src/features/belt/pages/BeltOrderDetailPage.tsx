import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltOrderDetailPageQuery } from "./__generated__/BeltOrderDetailPageQuery.graphql";
import { BeltStatusBadge } from "../components/BeltStatusBadge";
import { Button, Surface } from "../../../shared/ui";

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
    { fetchPolicy: "store-and-network" },
  );

  return (
    <Surface framed>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-bold uppercase text-muted-foreground">
            {view ? `${view} view` : "Order detail"}
          </p>
          <h2 className="m-0 text-xl font-semibold">
            {data.order.locationAddress}
          </h2>
        </div>
        <BeltStatusBadge status={data.order.status} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        <div>
          <dt className="text-xs text-muted-foreground">Dog</dt>
          <dd className="m-0 font-semibold">{data.order.dogId}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Owner</dt>
          <dd className="m-0 font-semibold">{data.order.ownerId}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Walker</dt>
          <dd className="m-0 font-semibold">
            {data.order.walkerId ?? "Unassigned"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Price</dt>
          <dd className="m-0 font-semibold">
            {data.order.priceAmount} {data.order.priceCurrency}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary">Accept</Button>
        <Button>Start</Button>
        <Button>Finish</Button>
      </div>
    </Surface>
  );
}
