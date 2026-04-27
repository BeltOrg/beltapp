import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltDogDetailPageQuery } from "./__generated__/BeltDogDetailPageQuery.graphql";

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
    <section className="belt-panel">
      <div className="belt-detail-header">
        <div>
          <p className="belt-eyebrow">Dog profile</p>
          <h2>{data.dog.name}</h2>
        </div>
        <span className="belt-status">{data.dog.size}</span>
      </div>
      <p>{data.dog.notes || "No notes"}</p>
      <div className="belt-tags">
        {data.dog.behaviorTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </section>
  );
}
