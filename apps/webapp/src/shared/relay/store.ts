import type { RecordProxy, RecordSourceSelectorProxy } from "relay-runtime";

export function prependRecordToRootListIfMissing(
  store: RecordSourceSelectorProxy,
  listFieldName: string,
  record: RecordProxy,
): void {
  const root = store.getRoot();
  const existingRecords = root.getLinkedRecords(listFieldName) ?? [];
  const recordId = record.getDataID();

  if (existingRecords.some((item) => item.getDataID() === recordId)) {
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

  const recordId = record.getDataID();
  root.setLinkedRecords(
    existingRecords.map((item) =>
      item.getDataID() === recordId ? record : item,
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
    existingRecords.filter((record) => record.getDataID() !== recordId),
    listFieldName,
  );
}
