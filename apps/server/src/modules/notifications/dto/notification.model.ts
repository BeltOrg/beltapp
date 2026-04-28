import { Field, ID, ObjectType } from '@nestjs/graphql';
import { NotificationType } from '../enums/notification-type.enum';

@ObjectType('Notification')
export class BeltNotification {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  recipientId!: string;

  @Field(() => NotificationType)
  type!: NotificationType;

  @Field()
  title!: string;

  @Field()
  body!: string;

  @Field(() => String, { nullable: true })
  actionUrl!: string | null;

  @Field(() => ID, { nullable: true })
  orderId!: string | null;

  @Field(() => ID, { nullable: true })
  actorId!: string | null;

  @Field(() => Date, { nullable: true })
  readAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;
}

export type NotificationCreatedPayload = {
  notificationCreated: BeltNotification;
};
