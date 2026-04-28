import type { RecordProxy, RecordSourceSelectorProxy } from "relay-runtime";

function getStableRecordId(record: RecordProxy): string {
  const id = record.getValue("id");
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : record.getDataID();
}

export function prependRecordToRootListIfMissing(
  store: RecordSourceSelectorProxy,
  listFieldName: string,
  record: RecordProxy,
): void {
  const root = store.getRoot();
  const existingRecords = root.getLinkedRecords(listFieldName) ?? [];
  const recordId = getStableRecordId(record);

  if (existingRecords.some((item) => getStableRecordId(item) === recordId)) {
    return;
  }

  root.setLinkedRecords([record, ...existingRecords], listFieldName);
}

export function replaceRecordInRootList(
  store: RecordSourceSelectorProxy,
  listFieldName: string,
  record: RecordProxy,
): void {
  const root = store.getRoot();
  const existingRecords = root.getLinkedRecords(listFieldName);

  if (!existingRecords) {
    return;
  }

  const recordId = getStableRecordId(record);
  root.setLinkedRecords(
    existingRecords.map((item) =>
      getStableRecordId(item) === recordId ? record : item,
    ),
    listFieldName,
  );
}

export function removeRecordFromRootList(
  store: RecordSourceSelectorProxy,
  listFieldName: string,
  recordId: string,
): void {
  const root = store.getRoot();
  const existingRecords = root.getLinkedRecords(listFieldName);

  if (!existingRecords) {
    return;
  }

  root.setLinkedRecords(
    existingRecords.filter((record) => getStableRecordId(record) !== recordId),
    listFieldName,
  );
}
