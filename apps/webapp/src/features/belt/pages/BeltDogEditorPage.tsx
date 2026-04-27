import {
  Button,
  Field,
  SelectInput,
  Surface,
  TextArea,
  TextInput,
} from "../../../shared/ui";

type BeltDogEditorPageProps = {
  mode: "create" | "edit";
};

export function BeltDogEditorPage({ mode }: BeltDogEditorPageProps) {
  return (
    <Surface framed className="max-w-xl">
      <h2 className="m-0 text-xl font-semibold">
        {mode === "create" ? "Add dog" : "Edit dog"}
      </h2>
      <form className="grid gap-3">
        <Field label="Name">
          <TextInput name="name" type="text" />
        </Field>
        <Field label="Size">
          <SelectInput name="size" defaultValue="MEDIUM">
            <option value="SMALL">Small</option>
            <option value="MEDIUM">Medium</option>
            <option value="LARGE">Large</option>
          </SelectInput>
        </Field>
        <Field label="Notes">
          <TextArea name="notes" rows={5} />
        </Field>
        <Button variant="primary">Save dog</Button>
      </form>
    </Surface>
  );
}
