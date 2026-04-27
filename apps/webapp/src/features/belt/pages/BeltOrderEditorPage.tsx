import { graphql, useLazyLoadQuery } from "react-relay";
import type { BeltOrderEditorPageQuery } from "./__generated__/BeltOrderEditorPageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import {
  Button,
  Field,
  SelectInput,
  Surface,
  TextInput,
} from "../../../shared/ui";

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
    <Surface framed className="max-w-2xl">
      <h2 className="m-0 text-xl font-semibold">Create walk</h2>
      {data.myDogs.length > 0 ? (
        <form className="grid gap-3">
          <Field label="Dog">
            <SelectInput name="dogId" defaultValue={data.myDogs[0]?.id}>
              {data.myDogs.map((dog) => (
                <option key={dog.id} value={dog.id}>
                  {dog.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Address">
            <TextInput name="locationAddress" type="text" />
          </Field>
          <Field label="Price">
            <TextInput name="priceAmount" type="number" min="0" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start">
              <TextInput name="startTime" type="datetime-local" />
            </Field>
            <Field label="End">
              <TextInput name="endTime" type="datetime-local" />
            </Field>
          </div>
          <Button variant="primary">Create order</Button>
        </form>
      ) : (
        <BeltEmptyState title="Add a dog before creating a walk" />
      )}
    </Surface>
  );
}
