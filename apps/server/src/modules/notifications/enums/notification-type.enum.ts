import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
  AVAILABLE_WALK_CREATED = 'AVAILABLE_WALK_CREATED',
  ORDER_ACCEPTED = 'ORDER_ACCEPTED',
  ORDER_STARTED = 'ORDER_STARTED',
  ORDER_FINISHED = 'ORDER_FINISHED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_PAID = 'ORDER_PAID',
  REVIEW_CREATED = 'REVIEW_CREATED',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});
