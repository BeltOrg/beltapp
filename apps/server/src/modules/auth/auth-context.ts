export type BeltGraphqlContext = {
  currentUserId: number | null;
};

function getSingleHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export function resolveCurrentUserIdFromHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
): number | null {
  const headerValue = getSingleHeaderValue(headers?.['x-belt-user-id']);
  const configuredFallback = process.env.BELT_MVP_USER_ID ?? '1';
  const rawValue = headerValue || configuredFallback;
  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}
