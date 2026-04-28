import {
  Environment,
  Network,
  Observable,
  type Disposable,
  type FetchFunction,
  type GraphQLResponse,
  type RequestParameters,
  type Variables,
} from "relay-runtime";
import type { RelayObservable } from "relay-runtime/lib/network/RelayObservable";
import { type FormattedExecutionResult, type Sink } from "graphql-ws";
import { refreshStoredAuthSession } from "../auth/auth-api";
import { getAccessToken } from "../auth/session";
import { HTTP_ENDPOINT, WS_ENDPOINT } from "../graphql/endpoints";
import { createRealtimeGraphqlWsClient } from "../realtime/realtime-connection";

const wsClient = createRealtimeGraphqlWsClient(WS_ENDPOINT, () => {
  const accessToken = getAccessToken();
  const connectionParams: Record<string, string> = {};

  if (accessToken) {
    connectionParams.authorization = `Bearer ${accessToken}`;
  }

  return connectionParams;
});

function getGraphqlErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const extensions = (error as { extensions?: unknown }).extensions;
  if (typeof extensions !== "object" || extensions === null) {
    return null;
  }

  const originalError = (extensions as { originalError?: unknown })
    .originalError;
  if (
    typeof originalError === "object" &&
    originalError !== null &&
    typeof (originalError as { code?: unknown }).code === "string"
  ) {
    return (originalError as { code: string }).code;
  }

  const code = (extensions as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function hasAuthRequiredError(response: GraphQLResponse): boolean {
  const errors = (response as { errors?: unknown[] }).errors ?? [];
  return errors.some(
    (error: unknown) => getGraphqlErrorCode(error) === "AUTH_REQUIRED",
  );
}

async function fetchGraphqlOnce(
  request: RequestParameters,
  variables: Variables,
): Promise<GraphQLResponse> {
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  const resp = await fetch(HTTP_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: request.text, variables }),
  });
  if (!resp.ok) {
    throw new Error("Response failed.");
  }
  return await resp.json();
}

const fetchGraphQL: FetchFunction = async (request, variables) => {
  const response = await fetchGraphqlOnce(request, variables);
  if (!hasAuthRequiredError(response)) {
    return response;
  }

  const refreshedSession = await refreshStoredAuthSession();
  if (!refreshedSession) {
    return response;
  }

  return fetchGraphqlOnce(request, variables);
};

function setupSubscription(
  operation: RequestParameters,
  variables: Variables,
): RelayObservable<GraphQLResponse> | Disposable {
  return Observable.create((sink) =>
    wsClient.subscribe(
      {
        operationName: operation.name,
        query: operation.text || "",
        variables,
      },
      sink as Sink<
        FormattedExecutionResult<GraphQLResponse, Record<string, unknown>>
      >,
    ),
  );
}

export function createRelayEnvironment(sessionKey?: string): Environment {
  void sessionKey;

  return new Environment({
    network: Network.create(fetchGraphQL, setupSubscription),
  });
}
