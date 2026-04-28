import { HttpException, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

/* GRAPHQL */
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

/* TYPEORM */
import { TypeOrmModule } from '@nestjs/typeorm';

import { randomUUID } from 'crypto';
import type { IncomingMessage } from 'http';
/* internal modules */
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getEnvFilePaths } from './config/env-paths';
import { BeltModule } from './modules/belt/belt.module';
import { ChatModule } from './modules/chat/chat.module';
import {
  createLoggedDataSource,
  getDatabaseConfig,
} from './config/database.config';
import { GraphqlRequestLike } from './modules/auth/auth-context';
import {
  isGraphqlSubscriptionLoggingEnabled,
  logStructuredEvent,
} from './logging/structured-log';

const subscriptionLogger = new Logger('GraphQLSubscriptions');

type GraphqlWsExtra = {
  connectionId?: string;
  request?: IncomingMessage;
};

type GraphqlHttpRequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  raw?: {
    headers?: Record<string, string | string[] | undefined>;
  };
};

type GraphqlContextFactoryInput = GraphqlHttpRequestLike & {
  connectionParams?: Record<string, unknown>;
  extra?: GraphqlWsExtra;
  req?: GraphqlHttpRequestLike;
  request?: GraphqlHttpRequestLike;
};

type DomainErrorResponse = {
  code?: unknown;
  message?: unknown;
};

function getGraphqlWsExtra(extra: unknown): GraphqlWsExtra {
  return extra ?? {};
}

function getGraphqlHttpHeaders({
  connectionParams,
  extra,
  headers,
  req,
  request,
}: GraphqlContextFactoryInput):
  | Record<string, string | string[] | undefined>
  | undefined {
  const resolvedHeaders =
    req?.headers ??
    req?.raw?.headers ??
    request?.headers ??
    request?.raw?.headers ??
    extra?.request?.headers ??
    headers;
  const wsConnectionHeaders = getGraphqlWsConnectionHeaders(connectionParams);

  if (!wsConnectionHeaders) {
    return resolvedHeaders;
  }

  if (
    resolvedHeaders?.authorization !== undefined ||
    resolvedHeaders?.Authorization !== undefined
  ) {
    return resolvedHeaders;
  }

  return {
    ...(resolvedHeaders ?? {}),
    ...wsConnectionHeaders,
  };
}

function getGraphqlWsConnectionHeaders(
  connectionParams: Record<string, unknown> | undefined,
): Record<string, string> | undefined {
  const authorization =
    getStringConnectionParam(connectionParams, 'authorization') ??
    getStringConnectionParam(connectionParams, 'Authorization');

  return authorization ? { authorization } : undefined;
}

function getStringConnectionParam(
  connectionParams: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = connectionParams?.[key];
  return typeof value === 'string' ? value : undefined;
}

function getRawGraphqlRequest(
  request: GraphqlHttpRequestLike | IncomingMessage | undefined,
): GraphqlHttpRequestLike | undefined {
  if (typeof request !== 'object' || request === null || !('raw' in request)) {
    return undefined;
  }

  return request.raw;
}

function getGraphqlHttpRequest(
  contextInput: GraphqlContextFactoryInput,
): GraphqlRequestLike {
  const request =
    contextInput.req ?? contextInput.request ?? contextInput.extra?.request;
  const rawRequest = getRawGraphqlRequest(request);

  return {
    ...(rawRequest ?? request ?? {}),
    headers: getGraphqlHttpHeaders(contextInput) ?? {},
  };
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (error instanceof HttpException) {
    return error.getResponse();
  }

  if (typeof error !== 'object' || error === null) {
    return null;
  }

  if ('originalError' in error) {
    return getHttpExceptionResponse(error.originalError);
  }

  return null;
}

function getDomainErrorResponse(error: unknown): DomainErrorResponse | null {
  const response = getHttpExceptionResponse(error);
  if (typeof response !== 'object' || response === null) {
    return null;
  }

  return response;
}

function getClientIp(request: IncomingMessage | undefined): string | null {
  if (!request) {
    return null;
  }

  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(',')[0]?.trim() ?? null;
  }

  return request.socket.remoteAddress ?? null;
}

function logSubscriptionEvent(
  event: string,
  details: Record<string, unknown>,
): void {
  if (!isGraphqlSubscriptionLoggingEnabled()) {
    return;
  }

  logStructuredEvent(subscriptionLogger, 'log', event, details);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePaths(),
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    BeltModule,
    ChatModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          path: configService.get<string>('GRAPHQL_PATH') ?? '/graphql',
          context: (contextInput: GraphqlContextFactoryInput) => ({
            req: getGraphqlHttpRequest(contextInput),
          }),
          formatError: (formattedError, error) => {
            const domainError = getDomainErrorResponse(error);
            if (typeof domainError?.code !== 'string') {
              return formattedError;
            }

            return {
              ...formattedError,
              extensions: {
                ...formattedError.extensions,
                code: domainError.code,
                originalError: domainError,
              },
            };
          },
          subscriptions: {
            'graphql-ws': {
              connectionInitWaitTimeout: 15_000,
              onConnect: (ctx) => {
                const extra = getGraphqlWsExtra(ctx.extra);
                const connectionId = randomUUID();
                extra.connectionId = connectionId;

                logSubscriptionEvent('graphql_subscription_connect', {
                  connectionId,
                  ip: getClientIp(extra.request),
                  path: extra.request?.url ?? null,
                });
              },
              onDisconnect: (ctx, code, reason) => {
                const extra = getGraphqlWsExtra(ctx.extra);

                logSubscriptionEvent('graphql_subscription_disconnect', {
                  connectionId: extra.connectionId ?? null,
                  code: code ?? null,
                  reason: reason ?? null,
                });
              },
              onSubscribe: (ctx, id, payload) => {
                const extra = getGraphqlWsExtra(ctx.extra);

                logSubscriptionEvent('graphql_subscription_subscribe', {
                  connectionId: extra.connectionId ?? null,
                  operationId: id,
                  operationName: payload.operationName ?? null,
                });
              },
            },
          },
          // Keep schema exploration available while the project is still being
          // migrated to its hosted production setup.
          introspection: true,
          plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
          playground: false,
          // GraphQL SDL is generated ahead of time into libs/api/schema.gql.
          // Runtime boot should not own or mutate the shared contract file.
          autoSchemaFile: true,
          sortSchema: true,
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
      dataSourceFactory: async (options) => createLoggedDataSource(options),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
