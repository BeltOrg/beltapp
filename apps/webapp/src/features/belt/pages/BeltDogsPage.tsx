import { Link } from "react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltDogsPageQuery } from "./__generated__/BeltDogsPageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import { Badge, Button, Card, Surface } from "../../../shared/ui";

export function BeltDogsPage() {
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
    <Surface>
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-semibold">Dog profiles</h2>
        <Button asChild variant="primary">
          <Link to="/dogs/new">Add dog</Link>
        </Button>
      </div>
      {data.myDogs.length > 0 ? (
        <ul className="grid gap-3 p-0 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
          {data.myDogs.map((dog) => (
            <Card key={dog.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="m-0 text-base font-semibold">{dog.name}</h3>
                <Badge>{dog.size}</Badge>
              </div>
              <p className="m-0 text-sm text-muted-foreground">
                {dog.notes || "No notes"}
              </p>
              <div className="flex flex-wrap gap-2">
                {dog.behaviorTags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <Link
                className="font-semibold text-primary"
                to={`/dogs/${dog.id}`}
              >
                Open profile
              </Link>
            </Card>
          ))}
        </ul>
      ) : (
        <BeltEmptyState
          title="No dogs yet"
          action={{ label: "Add dog", href: "/dogs/new" }}
        />
      )}
    </Surface>
  );
}
