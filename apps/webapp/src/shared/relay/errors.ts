const EMPTY_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function getRelayErrorMessage(error: Error): string {
  const message = error.message
    .replace(/^GraphQL Error:\s*/i, "")
    .replace(/^No data returned for operation.*$/i, EMPTY_ERROR_MESSAGE)
    .trim();

  return message || EMPTY_ERROR_MESSAGE;
}
