import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import {
  OWNER_ID,
  expectGraphqlErrorCodes,
  resetBeltFixture,
} from './belt-e2e-fixture';
import {
  GraphqlResponse,
  createE2eApp,
  createTestAccessToken,
  graphqlRequest,
} from './e2e-app';

const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      expiresIn
      user {
        id
        phone
        roles
        isVerified
      }
    }
  }
`;

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      expiresIn
      user {
        id
        phone
        roles
      }
    }
  }
`;

const REFRESH_MUTATION = `
  mutation RefreshSession($input: RefreshSessionInput!) {
    refreshSession(input: $input) {
      accessToken
      refreshToken
      expiresIn
      user {
        id
        phone
        roles
      }
    }
  }
`;

const LOGOUT_MUTATION = `
  mutation Logout($input: LogoutInput!) {
    logout(input: $input)
  }
`;

const ME_QUERY = `
  query Me {
    me {
      id
      phone
      roles
    }
  }
`;

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    phone: string;
    roles: string[];
    isVerified?: boolean;
  };
};

type RegisterData = {
  register: AuthPayload;
};

type LoginData = {
  login: AuthPayload;
};

type RefreshData = {
  refreshSession: AuthPayload;
};

describe('Belt auth (e2e)', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createE2eApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetBeltFixture(dataSource);
    await dataSource.query(
      `
        DELETE FROM auth_refresh_token
        WHERE user_id IN (
          SELECT id FROM belt_user WHERE phone LIKE '+37255599%'
        )
      `,
    );
    await dataSource.query(
      `
        DELETE FROM auth_account
        WHERE provider_subject LIKE '+37255599%'
      `,
    );
    await dataSource.query(
      `
        DELETE FROM belt_user
        WHERE phone LIKE '+37255599%'
      `,
    );
  });

  afterAll(async () => {
    if (dataSource) {
      await resetBeltFixture(dataSource);
      await dataSource.query(`
        DELETE FROM belt_user
        WHERE phone LIKE '+37255599%'
      `);
    }

    if (app) {
      await app.close();
    }
  });

  it('registers, logs in, refreshes, and logs out a local database user', async () => {
    const registerResponse = await graphqlRequest<RegisterData>(app, {
      query: REGISTER_MUTATION,
      variables: {
        input: {
          phone: '+3725559901',
          password: 'correct horse password',
          roles: ['OWNER'],
        },
      },
    });

    expect(registerResponse.errors).toBeUndefined();
    expect(registerResponse.data?.register).toMatchObject({
      expiresIn: 900,
      user: {
        phone: '+3725559901',
        roles: ['OWNER'],
        isVerified: true,
      },
    });
    expect(registerResponse.data?.register.accessToken).toEqual(
      expect.any(String),
    );
    expect(registerResponse.data?.register.refreshToken).toEqual(
      expect.any(String),
    );

    const loginResponse = await graphqlRequest<LoginData>(app, {
      query: LOGIN_MUTATION,
      variables: {
        input: {
          phone: '+3725559901',
          password: 'correct horse password',
        },
      },
    });
    expect(loginResponse.errors).toBeUndefined();
    expect(loginResponse.data?.login.user.phone).toBe('+3725559901');

    const refreshResponse = await graphqlRequest<RefreshData>(app, {
      query: REFRESH_MUTATION,
      variables: {
        input: {
          refreshToken: loginResponse.data!.login.refreshToken,
        },
      },
    });
    expect(refreshResponse.errors).toBeUndefined();
    expect(refreshResponse.data?.refreshSession.refreshToken).not.toBe(
      loginResponse.data!.login.refreshToken,
    );

    const logoutResponse = await graphqlRequest<{ logout: boolean }>(app, {
      query: LOGOUT_MUTATION,
      variables: {
        input: {
          refreshToken: refreshResponse.data!.refreshSession.refreshToken,
        },
      },
    });
    expect(logoutResponse.errors).toBeUndefined();
    expect(logoutResponse.data?.logout).toBe(true);
  });

  it('rejects invalid credentials and ignores the removed MVP user header', async () => {
    const invalidLoginResponse = await graphqlRequest<LoginData>(app, {
      query: LOGIN_MUTATION,
      variables: {
        input: {
          phone: '+3725559902',
          password: 'wrong password',
        },
      },
    });
    expectGraphqlErrorCodes(invalidLoginResponse, ['AUTH_INVALID_CREDENTIALS']);

    const headerOnlyResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'content-type': 'application/json',
        'x-belt-user-id': String(OWNER_ID),
      },
      payload: JSON.stringify({
        query: ME_QUERY,
      }),
    });
    expect(headerOnlyResponse.statusCode).toBe(200);
    const headerOnlyBody: GraphqlResponse<unknown> = headerOnlyResponse.json();
    expectGraphqlErrorCodes(headerOnlyBody, ['AUTH_REQUIRED']);
  });

  it('authenticates GraphQL requests with bearer tokens only', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${createTestAccessToken(app, OWNER_ID)}`,
      },
      payload: JSON.stringify({
        query: ME_QUERY,
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().errors).toBeUndefined();
    expect(response.json().data.me).toMatchObject({
      id: String(OWNER_ID),
      phone: '+3725550101',
      roles: ['OWNER'],
    });
  });
});
