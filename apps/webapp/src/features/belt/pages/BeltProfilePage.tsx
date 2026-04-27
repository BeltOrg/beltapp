import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltProfilePageQuery } from "./__generated__/BeltProfilePageQuery.graphql";
import { BeltUserSwitcher } from "../components/BeltUserSwitcher";

type BeltProfilePageProps = {
  onNavigate: (nextPath: string) => void;
};

export function BeltProfilePage({ onNavigate }: BeltProfilePageProps) {
  const data = useLazyLoadQuery<BeltProfilePageQuery>(
    graphql`
      query BeltProfilePageQuery {
        me {
          id
          phone
          roles
          rating
          isVerified
        }
      }
    `,
    {},
    { fetchPolicy: "network-only" },
  );

  return (
    <section className="belt-panel belt-panel--narrow">
      <h2>{data.me.phone}</h2>
      <dl className="belt-detail-list">
        <div>
          <dt>Roles</dt>
          <dd>{data.me.roles.join(", ")}</dd>
        </div>
        <div>
          <dt>Rating</dt>
          <dd>{data.me.rating.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Verified</dt>
          <dd>{data.me.isVerified ? "Yes" : "No"}</dd>
        </div>
      </dl>
      <BeltUserSwitcher onNavigate={onNavigate} />
      <div className="belt-action-row">
        <button type="button" className="belt-button">
          Logout
        </button>
      </div>
    </section>
  );
}
