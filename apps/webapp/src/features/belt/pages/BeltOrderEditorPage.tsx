import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltOrderEditorPageQuery } from "./__generated__/BeltOrderEditorPageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";

export function BeltOrderEditorPage() {
  const data = useLazyLoadQuery<BeltOrderEditorPageQuery>(
    graphql`
      query BeltOrderEditorPageQuery {
        myDogs {
          id
          name
        }
      }
    `,
    {},
    { fetchPolicy: "network-only" },
  );

  return (
    <section className="belt-panel">
      <h2>Create walk</h2>
      {data.myDogs.length > 0 ? (
        <form className="belt-form">
          <label className="belt-field">
            <span>Dog</span>
            <select name="dogId" defaultValue={data.myDogs[0]?.id}>
              {data.myDogs.map((dog) => (
                <option key={dog.id} value={dog.id}>
                  {dog.name}
                </option>
              ))}
            </select>
          </label>
          <label className="belt-field">
            <span>Address</span>
            <input name="locationAddress" type="text" />
          </label>
          <label className="belt-field">
            <span>Price</span>
            <input name="priceAmount" type="number" min="0" />
          </label>
          <div className="belt-form-grid">
            <label className="belt-field">
              <span>Start</span>
              <input name="startTime" type="datetime-local" />
            </label>
            <label className="belt-field">
              <span>End</span>
              <input name="endTime" type="datetime-local" />
            </label>
          </div>
          <button type="button" className="belt-button belt-button--primary">
            Create order
          </button>
        </form>
      ) : (
        <BeltEmptyState title="Add a dog before creating a walk" />
      )}
    </section>
  );
}
