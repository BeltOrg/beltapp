import { useNavigate } from "react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltProfilePageQuery } from "./__generated__/BeltProfilePageQuery.graphql";
import { BeltUserSwitcher } from "../components/BeltUserSwitcher";
import { Button, Surface } from "../../../shared/ui";

export function BeltProfilePage() {
  const navigate = useNavigate();
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
    { fetchPolicy: "store-and-network" },
  );

  return (
    <Surface framed className="max-w-xl">
      <h2 className="m-0 text-xl font-semibold">{data.me.phone}</h2>
      <dl className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        <div>
          <dt className="text-xs text-muted-foreground">Roles</dt>
          <dd className="m-0 font-semibold">{data.me.roles.join(", ")}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Rating</dt>
          <dd className="m-0 font-semibold">{data.me.rating.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Verified</dt>
          <dd className="m-0 font-semibold">
            {data.me.isVerified ? "Yes" : "No"}
          </dd>
        </div>
      </dl>
      <BeltUserSwitcher onNavigate={(nextPath) => void navigate(nextPath)} />
      <div className="flex flex-wrap gap-2">
        <Button>Logout</Button>
      </div>
    </Surface>
  );
}
