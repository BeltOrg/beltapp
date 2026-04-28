import type { Type } from '@nestjs/common';
import type { BuildSchemaOptions } from '@nestjs/graphql';
import { AUTH_GRAPHQL_RESOLVERS } from '../modules/auth/auth.module';
import { BELT_REALTIME_GRAPHQL_RESOLVERS } from '../modules/belt/events/belt-realtime.module';
import { DateScalar } from '../modules/common/scalars/date.scalar';
import { DOGS_GRAPHQL_RESOLVERS } from '../modules/dogs/dogs.module';
import { NOTIFICATIONS_GRAPHQL_RESOLVERS } from '../modules/notifications/notifications.module';
import { ORDERS_GRAPHQL_RESOLVERS } from '../modules/orders/orders.module';
import { REVIEWS_GRAPHQL_RESOLVERS } from '../modules/reviews/reviews.module';
import { USERS_GRAPHQL_RESOLVERS } from '../modules/users/users.module';

export const GRAPHQL_SCHEMA_RESOLVERS: Array<Type<unknown>> = [
  ...AUTH_GRAPHQL_RESOLVERS,
  ...USERS_GRAPHQL_RESOLVERS,
  ...DOGS_GRAPHQL_RESOLVERS,
  ...ORDERS_GRAPHQL_RESOLVERS,
  ...REVIEWS_GRAPHQL_RESOLVERS,
  ...NOTIFICATIONS_GRAPHQL_RESOLVERS,
  ...BELT_REALTIME_GRAPHQL_RESOLVERS,
];

export const GRAPHQL_SCHEMA_SCALARS: Array<Type<unknown>> = [DateScalar];

export const GRAPHQL_SCHEMA_BUILD_OPTIONS: BuildSchemaOptions = {
  orphanedTypes: [],
};
