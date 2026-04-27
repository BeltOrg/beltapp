import { Link } from "react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltDashboardPageQuery } from "./__generated__/BeltDashboardPageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import { BeltStatusBadge } from "../components/BeltStatusBadge";
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
    { fetchPolicy: "network-only" },
  );

  const activeOrders = [
    ...data.myOwnerOrders.map((order) => ({ ...order, side: "Owner" })),
    ...data.myWalkerOrders.map((order) => ({ ...order, side: "Walker" })),
  ].filter((order) => order.status !== "PAID" && order.status !== "CANCELLED");

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
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-xl font-semibold">Active walks</h2>
          <Button asChild variant="primary">
            <Link to="/orders/new">New walk</Link>
          </Button>
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
            action={{
              label: "Create walk",
              href: "/orders/new",
            }}
          />
        )}
      </Surface>

      <Surface>
        <div className="flex items-center justify-between gap-3">
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
            action={{ label: "Add dog", href: "/dogs/new" }}
          />
        )}
      </Surface>
    </div>
  );
}
