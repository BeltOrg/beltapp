import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltDogDetailPageQuery } from "./__generated__/BeltDogDetailPageQuery.graphql";
import { Badge, Surface } from "../../../shared/ui";

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
    { fetchPolicy: "network-only" },
  );

  return (
    <Surface>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-bold uppercase text-muted-foreground">
            Dog profile
          </p>
          <h2 className="m-0 text-xl font-semibold">{data.dog.name}</h2>
        </div>
        <Badge>{data.dog.size}</Badge>
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
