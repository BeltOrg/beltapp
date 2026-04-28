import { HTTP_ENDPOINT } from "../graphql/endpoints";
import {
  type AuthPayload,
  type AuthSession,
  type UserRole,
  clearAuthSession,
  getAccessToken,
  getAuthSession,
  setAuthSessionFromPayload,
} from "./session";

const AUTH_USER_FIELDS = `
  id
  phone
  roles
  rating
  isVerified
`;

type GraphqlError = {
  message?: string;
  extensions?: {
    code?: string;
    originalError?: {
      code?: string;
      message?: string;
    };
  };
};

type GraphqlResponse<TData> = {
  data?: TData | null;
  errors?: GraphqlError[];
};

type AuthMutationData = {
  login?: AuthPayload;
  register?: AuthPayload;
  refreshSession?: AuthPayload;
};

type LogoutData = {
  logout: boolean;
};

const LOGIN_MUTATION = `
  mutation BeltLogin($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      expiresIn
      user {
        ${AUTH_USER_FIELDS}
      }
    }
  }
`;

const REGISTER_MUTATION = `
  mutation BeltRegister($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      expiresIn
      user {
        ${AUTH_USER_FIELDS}
      }
    }
  }
`;

const REFRESH_SESSION_MUTATION = `
  mutation BeltRefreshSession($input: RefreshSessionInput!) {
    refreshSession(input: $input) {
      accessToken
      refreshToken
      expiresIn
      user {
        ${AUTH_USER_FIELDS}
      }
    }
  }
`;

const LOGOUT_MUTATION = `
  mutation BeltLogout($input: LogoutInput!) {
    logout(input: $input)
  }
`;

let refreshPromise: Promise<AuthSession | null> | null = null;

export class AuthApiError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
  }
}

async function requestGraphql<TData>(
  query: string,
  variables: Record<string, unknown>,
  accessToken?: string | null,
): Promise<TData> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(HTTP_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new AuthApiError("The auth request failed.");
  }

  const payload = (await response.json()) as GraphqlResponse<TData>;
  if (payload.errors?.length) {
    const error = payload.errors[0];
    throw new AuthApiError(
      error.extensions?.originalError?.message ??
        error.message ??
        "The auth request failed.",
      error.extensions?.originalError?.code ?? error.extensions?.code ?? null,
    );
  }

  if (!payload.data) {
    throw new AuthApiError("The auth request returned no data.");
  }

  return payload.data;
}

export async function loginWithPassword(input: {
  phone: string;
  password: string;
}): Promise<AuthSession> {
  const data = await requestGraphql<AuthMutationData>(LOGIN_MUTATION, {
    input,
  });

  return setAuthSessionFromPayload(data.login!);
}

export async function registerWithPassword(input: {
  phone: string;
  password: string;
  roles: UserRole[];
}): Promise<AuthSession> {
  const data = await requestGraphql<AuthMutationData>(REGISTER_MUTATION, {
    input,
  });

  return setAuthSessionFromPayload(data.register!);
}

export async function refreshStoredAuthSession(): Promise<AuthSession | null> {
  const session = getAuthSession();
  if (!session) {
    return null;
  }

  refreshPromise ??= requestGraphql<AuthMutationData>(
    REFRESH_SESSION_MUTATION,
    {
      input: {
        refreshToken: session.refreshToken,
      },
    },
    getAccessToken(),
  )
    .then((data) => setAuthSessionFromPayload(data.refreshSession!))
    .catch(() => {
      clearAuthSession();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function logoutCurrentSession(): Promise<void> {
  const session = getAuthSession();
  clearAuthSession();

  if (!session) {
    return;
  }

  try {
    await requestGraphql<LogoutData>(LOGOUT_MUTATION, {
      input: {
        refreshToken: session.refreshToken,
      },
    });
  } catch {
    // Local session state is already cleared. A stale refresh token can expire
    // server-side without blocking the user from leaving the session.
  }
}
