import { Module } from '@nestjs/common';
import { AuthResolver } from './auth.resolver';
import { GraphqlAuthGuard } from './graphql-auth.guard';

export const AUTH_GRAPHQL_RESOLVERS = [AuthResolver] as const;

@Module({
  providers: [GraphqlAuthGuard, ...AUTH_GRAPHQL_RESOLVERS],
  exports: [GraphqlAuthGuard],
})
export class AuthModule {}
