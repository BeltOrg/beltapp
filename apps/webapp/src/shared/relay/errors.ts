const EMPTY_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function getRelayErrorMessage(error: Error): string {
  const rawMessage = error.message.replace(/^GraphQL Error:\s*/i, "").trim();
  const noDataMarker = ", got error(s): ";
  const noDataMarkerStart = rawMessage.indexOf(noDataMarker);

  if (rawMessage.startsWith("No data returned for operation")) {
    if (noDataMarkerStart === -1) {
      return EMPTY_ERROR_MESSAGE;
    }

    const messageStart = noDataMarkerStart + noDataMarker.length;
    const messageEnd = rawMessage.indexOf(" See the error `source` property");
    const extractedMessage = rawMessage
      .slice(messageStart, messageEnd === -1 ? undefined : messageEnd)
      .trim();

    return extractedMessage || EMPTY_ERROR_MESSAGE;
  }

  return rawMessage || EMPTY_ERROR_MESSAGE;
}
