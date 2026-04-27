import { Link } from "react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltDogDetailPageQuery } from "./__generated__/BeltDogDetailPageQuery.graphql";
import { Badge, Button, Surface } from "../../../shared/ui";

type BeltDogDetailPageProps = {
  dogId: string;
};

export function BeltDogDetailPage({ dogId }: BeltDogDetailPageProps) {
  const data = useLazyLoadQuery<BeltDogDetailPageQuery>(
    graphql`
      query BeltDogDetailPageQuery($id: ID!) {
        dog(id: $id) {
          id
          name
          size
          behaviorTags
          notes
        }
      }
    `,
    { id: dogId },
    { fetchPolicy: "store-and-network" },
  );

  return (
    <Surface>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <p className="m-0 text-xs font-bold uppercase text-muted-foreground">
            Dog profile
          </p>
          <h2 className="m-0 text-xl font-semibold">{data.dog.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{data.dog.size}</Badge>
          <Button asChild>
            <Link to={`/dogs/${data.dog.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>
      <p className="m-0 text-muted-foreground">
        {data.dog.notes || "No notes"}
      </p>
      <div className="flex flex-wrap gap-2">
        {data.dog.behaviorTags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </Surface>
  );
}
