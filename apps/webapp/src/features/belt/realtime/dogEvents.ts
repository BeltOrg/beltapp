import type { RecordSourceSelectorProxy } from "relay-runtime";
import {
  prependRecordToRootListIfMissing,
  removeRecordFromRootList,
  replaceRecordInRootList,
} from "../../../shared/relay/store";
import type { BeltEventsSubscriptionResponse } from "./useBeltEventsSubscription";

const DOG_ADD_OR_UPDATE_EVENTS = new Set(["DOG_CREATED", "DOG_UPDATED"]);

export function applyMyDogsEvent(store: RecordSourceSelectorProxy): void {
  const event = store.getRootField("beltEvent");
  if (!event) {
    return;
  }

  const eventType = event.getValue("type");
  const subjectId = event.getValue("subjectId");
  if (typeof eventType !== "string" || typeof subjectId !== "string") {
    return;
  }

  if (eventType === "DOG_DELETED") {
    removeRecordFromRootList(store, "myDogs", subjectId);
    return;
  }

  if (!DOG_ADD_OR_UPDATE_EVENTS.has(eventType)) {
    return;
  }

  const dog = event.getLinkedRecord("dog");
  if (!dog) {
    return;
  }

  replaceRecordInRootList(store, "myDogs", dog);
  prependRecordToRootListIfMissing(store, "myDogs", dog);
}

export function isDogDeleteEventForId(
  response: BeltEventsSubscriptionResponse | null | undefined,
  dogId: string,
): boolean {
  const event = response?.beltEvent;
  return event?.type === "DOG_DELETED" && event.subjectId === dogId;
}
