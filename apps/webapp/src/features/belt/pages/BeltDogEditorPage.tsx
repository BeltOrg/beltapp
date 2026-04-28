import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type {
  BeltDogEditorPageCreateDogMutation,
  DogBehavior,
  DogSize,
} from "./__generated__/BeltDogEditorPageCreateDogMutation.graphql";
import type { BeltDogEditorPageDeleteDogMutation } from "./__generated__/BeltDogEditorPageDeleteDogMutation.graphql";
import type { BeltDogEditorPageEditQuery } from "./__generated__/BeltDogEditorPageEditQuery.graphql";
import type { BeltDogEditorPageUpdateDogMutation } from "./__generated__/BeltDogEditorPageUpdateDogMutation.graphql";
import {
  applyMyDogsEvent,
  isDogDeleteEventForId,
} from "../realtime/dogEvents";
import {
  type BeltEventsSubscriptionResponse,
  useBeltEventsSubscription,
} from "../realtime/useBeltEventsSubscription";
import { getRelayErrorMessage } from "../../../shared/relay/errors";
import {
  prependRecordToRootListIfMissing,
  removeRecordFromRootList,
  replaceRecordInRootList,
} from "../../../shared/relay/store";
import {
  Alert,
  Button,
  Field,
  SelectInput,
  Surface,
  TextArea,
  TextInput,
} from "../../../shared/ui";

type BeltDogEditorPageProps = {
  mode: "create" | "edit";
  dogId?: string;
};

type DogFormValues = {
  behaviorTags: ReadonlyArray<DogBehavior>;
  name: string;
  notes: string | null;
  size: DogSize;
};

const DOG_SIZE_OPTIONS = [
  { label: "Small", value: "SMALL" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Large", value: "LARGE" },
] satisfies Array<{ label: string; value: DogSize }>;

const DOG_BEHAVIOR_OPTIONS = [
  { label: "Friendly", value: "FRIENDLY" },
  { label: "Reactive", value: "REACTIVE" },
  { label: "Needs experienced walker", value: "NEEDS_EXPERIENCED_WALKER" },
  { label: "Aggressive", value: "AGGRESSIVE" },
] satisfies Array<{ label: string; value: DogBehavior }>;

function readTextField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readDogForm(form: HTMLFormElement): DogFormValues | string {
  const formData = new FormData(form);
  const name = readTextField(formData, "name");
  const notes = readTextField(formData, "notes");
  const size = readTextField(formData, "size") as DogSize;
  const behaviorTags = formData
    .getAll("behaviorTags")
    .filter((value): value is DogBehavior => typeof value === "string");

  if (!name) {
    return "Dog name is required.";
  }

  if (name.length > 80) {
    return "Dog name must be 80 characters or less.";
  }

  if (!DOG_SIZE_OPTIONS.some((option) => option.value === size)) {
    return "Select a dog size.";
  }

  if (notes.length > 500) {
    return "Dog notes must be 500 characters or less.";
  }

  return {
    behaviorTags,
    name,
    notes: notes || null,
    size,
  };
}

function DogForm({
  defaultValues,
  isSaving,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<DogFormValues>;
  isSaving: boolean;
  onSubmit: (form: HTMLFormElement) => void;
  submitLabel: string;
}) {
  return (
    <form
      aria-busy={isSaving}
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event.currentTarget);
      }}
    >
      <fieldset className="grid gap-3 border-0 p-0" disabled={isSaving}>
        <Field label="Name">
          <TextInput
            name="name"
            type="text"
            defaultValue={defaultValues?.name ?? ""}
            maxLength={80}
            required
          />
        </Field>
        <Field label="Size">
          <SelectInput
            name="size"
            defaultValue={defaultValues?.size ?? "MEDIUM"}
            required
          >
            {DOG_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <fieldset className="grid gap-2 rounded-ui border border-border p-3">
          <legend className="px-1 text-sm font-semibold text-muted-foreground">
            Behavior
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DOG_BEHAVIOR_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm font-medium"
              >
                <input
                  type="checkbox"
                  name="behaviorTags"
                  value={option.value}
                  defaultChecked={defaultValues?.behaviorTags?.includes(
                    option.value,
                  )}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Notes">
          <TextArea
            name="notes"
            rows={5}
            defaultValue={defaultValues?.notes ?? ""}
            maxLength={500}
          />
        </Field>
      </fieldset>
      <Button variant="primary" type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

function CreateDogPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [commitCreateDog, isCreating] =
    useMutation<BeltDogEditorPageCreateDogMutation>(graphql`
      mutation BeltDogEditorPageCreateDogMutation($input: CreateDogInput!) {
        createDog(input: $input) {
          id
          name
          size
          behaviorTags
          notes
        }
      }
    `);

  function handleSubmit(form: HTMLFormElement) {
    const values = readDogForm(form);
    if (typeof values === "string") {
      setFormError(values);
      return;
    }

    setFormError(null);
    commitCreateDog({
      variables: { input: values },
      updater: (store) => {
        const newDog = store.getRootField("createDog");
        if (!newDog) {
          return;
        }

        prependRecordToRootListIfMissing(store, "myDogs", newDog);
      },
      onCompleted: ({ createDog }) => {
        void navigate(`/dogs/${createDog.id}`);
      },
      onError: (error) => {
        setFormError(getRelayErrorMessage(error));
      },
    });
  }

  return (
    <Surface framed className="max-w-xl">
      <h2 className="m-0 text-xl font-semibold">Add dog</h2>
      {formError ? <Alert>{formError}</Alert> : null}
      <DogForm
        isSaving={isCreating}
        onSubmit={handleSubmit}
        submitLabel="Save dog"
      />
    </Surface>
  );
}

function EditDogPage({ dogId }: { dogId: string }) {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [wasDeleted, setWasDeleted] = useState(false);
  const data = useLazyLoadQuery<BeltDogEditorPageEditQuery>(
    graphql`
      query BeltDogEditorPageEditQuery($id: ID!) {
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
  const handleBeltEvent = useCallback(
    (response: BeltEventsSubscriptionResponse | null | undefined) => {
      if (isDogDeleteEventForId(response, dogId)) {
        setWasDeleted(true);
        setFormError("This dog profile was deleted in another session.");
      }
    },
    [dogId],
  );
  useBeltEventsSubscription({
    onNext: handleBeltEvent,
    updater: applyMyDogsEvent,
  });
  const [commitUpdateDog, isUpdating] =
    useMutation<BeltDogEditorPageUpdateDogMutation>(graphql`
      mutation BeltDogEditorPageUpdateDogMutation(
        $id: ID!
        $input: UpdateDogInput!
      ) {
        updateDog(id: $id, input: $input) {
          id
          name
          size
          behaviorTags
          notes
        }
      }
    `);
  const [commitDeleteDog, isDeleting] =
    useMutation<BeltDogEditorPageDeleteDogMutation>(graphql`
      mutation BeltDogEditorPageDeleteDogMutation($id: ID!) {
        deleteDog(id: $id)
      }
    `);
  const isSaving = isUpdating || isDeleting;

  function handleSubmit(form: HTMLFormElement) {
    const values = readDogForm(form);
    if (typeof values === "string") {
      setFormError(values);
      return;
    }

    setFormError(null);
    commitUpdateDog({
      variables: { id: dogId, input: values },
      updater: (store) => {
        const updatedDog = store.getRootField("updateDog");
        if (updatedDog) {
          replaceRecordInRootList(store, "myDogs", updatedDog);
        }
      },
      onCompleted: ({ updateDog }) => {
        void navigate(`/dogs/${updateDog.id}`);
      },
      onError: (error) => {
        setFormError(getRelayErrorMessage(error));
      },
    });
  }

  function handleDelete() {
    const shouldDelete = window.confirm(`Delete ${data.dog.name}?`);
    if (!shouldDelete) {
      return;
    }

    setFormError(null);
    commitDeleteDog({
      variables: { id: dogId },
      updater: (store) => {
        removeRecordFromRootList(store, "myDogs", dogId);
      },
      onCompleted: () => {
        void navigate("/dogs");
      },
      onError: (error) => {
        setFormError(getRelayErrorMessage(error));
      },
    });
  }

  return (
    <Surface framed className="max-w-xl">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <h2 className="m-0 text-xl font-semibold">Edit dog</h2>
        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={isSaving || wasDeleted}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
      {formError ? <Alert>{formError}</Alert> : null}
      {wasDeleted ? (
        <Button onClick={() => void navigate("/dogs", { replace: true })}>
          Back to dogs
        </Button>
      ) : (
        <DogForm
          defaultValues={data.dog}
          isSaving={isSaving}
          onSubmit={handleSubmit}
          submitLabel="Save dog"
        />
      )}
    </Surface>
  );
}

export function BeltDogEditorPage({ dogId, mode }: BeltDogEditorPageProps) {
  if (mode === "edit") {
    return dogId ? <EditDogPage dogId={dogId} /> : null;
  }

  return <CreateDogPage />;
}
