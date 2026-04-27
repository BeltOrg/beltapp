import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { getMigrationDataSourceOptions } from '../src/config/database.config';

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

  if (options.userId !== undefined) {
    headers['x-belt-user-id'] =
      options.userId === null ? '0' : String(options.userId);
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
