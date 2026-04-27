import { registerEnumType } from '@nestjs/graphql';

export enum OrderStatus {
  CREATED = 'CREATED',
  ACCEPTED = 'ACCEPTED',
  STARTED = 'STARTED',
  FINISHED = 'FINISHED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

registerEnumType(OrderStatus, {
  name: 'OrderStatus',
});
