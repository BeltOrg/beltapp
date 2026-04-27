import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltDashboardPageQuery } from "./__generated__/BeltDashboardPageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import { BeltStatusBadge } from "../components/BeltStatusBadge";

type BeltDashboardPageProps = {
  onNavigate: (nextPath: string) => void;
};

export function BeltDashboardPage({ onNavigate }: BeltDashboardPageProps) {
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
    <div className="belt-page-grid">
      <section className="belt-panel belt-panel--summary">
        <div>
          <p className="belt-eyebrow">Current session</p>
          <h2>{data.me.phone}</h2>
        </div>
        <dl className="belt-metrics">
          <div>
            <dt>Roles</dt>
            <dd>{data.me.roles.join(", ")}</dd>
          </div>
          <div>
            <dt>Dogs</dt>
            <dd>{data.myDogs.length}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>{data.me.rating.toFixed(1)}</dd>
          </div>
        </dl>
      </section>

      <section className="belt-panel">
        <div className="belt-section-heading">
          <h2>Active walks</h2>
          <a
            href="/orders/new"
            className="belt-button belt-button--primary"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/orders/new");
            }}
          >
            New walk
          </a>
        </div>
        {activeOrders.length > 0 ? (
          <ul className="belt-list">
            {activeOrders.map((order) => (
              <li key={`${order.side}-${order.id}`} className="belt-list-item">
                <div>
                  <strong>{order.locationAddress}</strong>
                  <span>{order.side}</span>
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
              onNavigate,
            }}
          />
        )}
      </section>

      <section className="belt-panel">
        <div className="belt-section-heading">
          <h2>Dogs</h2>
          <a
            href="/dogs"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/dogs");
            }}
          >
            View all
          </a>
        </div>
        {data.myDogs.length > 0 ? (
          <ul className="belt-list">
            {data.myDogs.slice(0, 4).map((dog) => (
              <li key={dog.id} className="belt-list-item">
                <div>
                  <strong>{dog.name}</strong>
                  <span>{dog.size}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <BeltEmptyState
            title="No dogs yet"
            action={{ label: "Add dog", href: "/dogs/new", onNavigate }}
          />
        )}
      </section>
    </div>
  );
}
