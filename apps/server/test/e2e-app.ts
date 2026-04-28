import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { getMigrationDataSourceOptions } from '../src/config/database.config';
import { getAuthTokenConfig } from '../src/modules/auth/auth.config';

export type GraphqlResponse<TData> = {
  data?: TData;
  errors?: Array<{
    message: string;
    extensions?: Record<string, unknown>;
  }>;
};

type GraphqlRequestOptions = {
  query: string;
  variables?: Record<string, unknown>;
  userId?: number | null;
};

let migrationsReady: Promise<void> | undefined;

async function runMigrations(): Promise<void> {
  const dataSource = new DataSource(getMigrationDataSourceOptions());

  try {
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function ensureE2eDatabase(): Promise<void> {
  migrationsReady ??= runMigrations();
  await migrationsReady;
}

export async function createE2eApp(): Promise<NestFastifyApplication> {
  process.env.AUTH_JWT_ACCESS_SECRET ??= 'test-access-secret';
  process.env.AUTH_REFRESH_TOKEN_PEPPER ??= 'test-refresh-pepper';
  process.env.AUTH_JWT_ACCESS_TTL_SECONDS ??= '900';
  process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS ??= '2592000';
  process.env.DATABASE_SYNCHRONIZE = 'false';
  process.env.DATABASE_SSL ??= 'false';
  process.env.PUBSUB_DRIVER ??= 'memory';

  await ensureE2eDatabase();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}

export async function graphqlRequest<TData>(
  app: NestFastifyApplication,
  options: GraphqlRequestOptions,
): Promise<GraphqlResponse<TData>> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (options.userId !== undefined && options.userId !== null) {
    headers.authorization = `Bearer ${createTestAccessToken(
      app,
      options.userId,
    )}`;
  }

  const response = await app.inject({
    method: 'POST',
    url: '/graphql',
    headers,
    payload: JSON.stringify({
      query: options.query,
      variables: options.variables ?? {},
    }),
  });

  expect(response.statusCode).toBe(200);

  return response.json();
}

export function createTestAccessToken(
  app: NestFastifyApplication,
  userId: number,
): string {
  const jwtService = app.get(JwtService);
  const config = getAuthTokenConfig();

  return jwtService.sign(
    { sub: String(userId) },
    {
      secret: config.accessTokenSecret,
      expiresIn: config.accessTokenTtlSeconds,
      issuer: config.issuer,
      audience: config.audience,
    },
  );
}
