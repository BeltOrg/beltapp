import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltDogsPageQuery } from "./__generated__/BeltDogsPageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";

type BeltDogsPageProps = {
  onNavigate: (nextPath: string) => void;
};

export function BeltDogsPage({ onNavigate }: BeltDogsPageProps) {
  const data = useLazyLoadQuery<BeltDogsPageQuery>(
    graphql`
      query BeltDogsPageQuery {
        myDogs {
          id
          name
          size
          behaviorTags
          notes
        }
      }
    `,
    {},
    { fetchPolicy: "network-only" },
  );

  return (
    <section className="belt-panel">
      <div className="belt-section-heading">
        <h2>Dog profiles</h2>
        <a
          href="/dogs/new"
          className="belt-button belt-button--primary"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/dogs/new");
          }}
        >
          Add dog
        </a>
      </div>
      {data.myDogs.length > 0 ? (
        <ul className="belt-card-grid">
          {data.myDogs.map((dog) => (
            <li key={dog.id} className="belt-card">
              <div className="belt-card__header">
                <h3>{dog.name}</h3>
                <span>{dog.size}</span>
              </div>
              <p>{dog.notes || "No notes"}</p>
              <div className="belt-tags">
                {dog.behaviorTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <a
                href={`/dogs/${dog.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(`/dogs/${dog.id}`);
                }}
              >
                Open profile
              </a>
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
  );
}
