import { useState } from "react";
import { useNavigate } from "react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { BeltOrderEditorPageCreateOrderMutation } from "./__generated__/BeltOrderEditorPageCreateOrderMutation.graphql";
import type { BeltOrderEditorPageQuery } from "./__generated__/BeltOrderEditorPageQuery.graphql";
import { BeltEmptyState } from "../components/BeltEmptyState";
import { getRelayErrorMessage } from "../../../shared/relay/errors";
import {
  Alert,
  Button,
  Field,
  SelectInput,
  Surface,
  TextInput,
} from "../../../shared/ui";

type OrderFormValues = {
  dogId: string;
  endTime: number;
  locationAddress: string;
  locationLat: number;
  locationLng: number;
  priceAmount: number;
  priceCurrency: string;
  startTime: number;
};

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function toDatetimeLocalValue(date: Date): string {
  return [
    date.getFullYear(),
    "-",
    padDatePart(date.getMonth() + 1),
    "-",
    padDatePart(date.getDate()),
    "T",
    padDatePart(date.getHours()),
    ":",
    padDatePart(date.getMinutes()),
  ].join("");
}

function createDefaultTimes() {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    endTime: toDatetimeLocalValue(end),
    startTime: toDatetimeLocalValue(start),
  };
}

function readTextField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseLocalDateTime(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function readOrderForm(form: HTMLFormElement): OrderFormValues | string {
  const formData = new FormData(form);
  const dogId = readTextField(formData, "dogId");
  const locationAddress = readTextField(formData, "locationAddress");
  const priceAmount = Number.parseInt(
    readTextField(formData, "priceAmount"),
    10,
  );
  const locationLat = Number.parseFloat(readTextField(formData, "locationLat"));
  const locationLng = Number.parseFloat(readTextField(formData, "locationLng"));
  const startTime = parseLocalDateTime(readTextField(formData, "startTime"));
  const endTime = parseLocalDateTime(readTextField(formData, "endTime"));

  if (!dogId) {
    return "Select a dog.";
  }

  if (!locationAddress) {
    return "Address is required.";
  }

  if (locationAddress.length > 240) {
    return "Address must be 240 characters or less.";
  }

  if (!Number.isInteger(priceAmount) || priceAmount < 0) {
    return "Price must be a whole number.";
  }

  if (!Number.isFinite(locationLat) || !Number.isFinite(locationLng)) {
    return "Location coordinates are required.";
  }

  if (!startTime || !endTime) {
    return "Start and end times are required.";
  }

  if (endTime <= startTime) {
    return "End time must be after start time.";
  }

  return {
    dogId,
    endTime,
    locationAddress,
    locationLat,
    locationLng,
    priceAmount,
    priceCurrency: "EUR",
    startTime,
  };
}

export function BeltOrderEditorPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [defaultTimes] = useState(createDefaultTimes);
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
    { fetchPolicy: "store-and-network" },
  );
  const [commitCreateOrder, isCreating] =
    useMutation<BeltOrderEditorPageCreateOrderMutation>(graphql`
      mutation BeltOrderEditorPageCreateOrderMutation(
        $input: CreateOrderInput!
      ) {
        createOrder(input: $input) {
          id
          status
          startTime
          locationAddress
          walkerId
        }
      }
    `);

  function handleSubmit(form: HTMLFormElement) {
    const values = readOrderForm(form);
    if (typeof values === "string") {
      setFormError(values);
      return;
    }

    setFormError(null);
    commitCreateOrder({
      variables: { input: values },
      updater: (store) => {
        const newOrder = store.getRootField("createOrder");
        if (!newOrder) {
          return;
        }

        const root = store.getRoot();
        const currentOrders = root.getLinkedRecords("myOwnerOrders") ?? [];
        if (
          currentOrders.some(
            (order) => order.getDataID() === newOrder.getDataID(),
          )
        ) {
          return;
        }

        root.setLinkedRecords([newOrder, ...currentOrders], "myOwnerOrders");
      },
      onCompleted: ({ createOrder }) => {
        void navigate(`/orders/${createOrder.id}/waiting`);
      },
      onError: (error) => {
        setFormError(getRelayErrorMessage(error));
      },
    });
  }

  return (
    <Surface framed className="max-w-2xl">
      <h2 className="m-0 text-xl font-semibold">Create walk</h2>
      {data.myDogs.length > 0 ? (
        <form
          aria-busy={isCreating}
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(event.currentTarget);
          }}
        >
          {formError ? <Alert>{formError}</Alert> : null}
          <fieldset className="grid gap-3 border-0 p-0" disabled={isCreating}>
            <Field label="Dog">
              <SelectInput
                name="dogId"
                defaultValue={data.myDogs[0]?.id}
                required
              >
                {data.myDogs.map((dog) => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Address">
              <TextInput
                name="locationAddress"
                type="text"
                maxLength={240}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Price">
                <TextInput
                  name="priceAmount"
                  type="number"
                  min="0"
                  step="1"
                  required
                />
              </Field>
              <Field label="Latitude">
                <TextInput
                  name="locationLat"
                  type="number"
                  step="0.000001"
                  defaultValue="59.437000"
                  required
                />
              </Field>
              <Field label="Longitude">
                <TextInput
                  name="locationLng"
                  type="number"
                  step="0.000001"
                  defaultValue="24.753600"
                  required
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start">
                <TextInput
                  name="startTime"
                  type="datetime-local"
                  defaultValue={defaultTimes.startTime}
                  required
                />
              </Field>
              <Field label="End">
                <TextInput
                  name="endTime"
                  type="datetime-local"
                  defaultValue={defaultTimes.endTime}
                  required
                />
              </Field>
            </div>
          </fieldset>
          <Button variant="primary" type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create order"}
          </Button>
        </form>
      ) : (
        <BeltEmptyState
          title="Add a dog before creating a walk"
          description="Walk requests need an owner dog profile first."
          action={{ label: "Add dog", href: "/dogs/new" }}
        />
      )}
    </Surface>
  );
}
