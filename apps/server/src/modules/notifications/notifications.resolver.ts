import {
  Args,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  BeltGraphqlContext,
  getCurrentUserFromContext,
} from '../auth/auth-context';
import { CurrentUserId } from '../auth/current-user.decorator';
import { GraphqlAuthGuard } from '../auth/graphql-auth.guard';
import {
  BeltNotification,
  NotificationCreatedPayload,
} from './dto/notification.model';
import { mapNotification } from './notifications.mapper';
import { NotificationsService } from './notifications.service';

@Resolver(() => BeltNotification)
@UseGuards(GraphqlAuthGuard)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Query(() => [BeltNotification])
  async myNotifications(
    @CurrentUserId() currentUserId: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<BeltNotification[]> {
    return (await this.notificationsService.findMine(currentUserId, limit)).map(
      mapNotification,
    );
  }

  @Query(() => Int)
  myUnreadNotificationCount(
    @CurrentUserId() currentUserId: number,
  ): Promise<number> {
    return this.notificationsService.countUnread(currentUserId);
  }

  @Mutation(() => BeltNotification)
  async markNotificationRead(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<BeltNotification> {
    return mapNotification(
      await this.notificationsService.markRead(Number(id), currentUserId),
    );
  }

  @Mutation(() => Boolean)
  markAllNotificationsRead(
    @CurrentUserId() currentUserId: number,
  ): Promise<boolean> {
    return this.notificationsService.markAllRead(currentUserId);
  }

  @Subscription(() => BeltNotification, {
    filter: (
      payload: NotificationCreatedPayload,
      _variables: unknown,
      context: BeltGraphqlContext,
    ) => {
      const currentUser = getCurrentUserFromContext(context);
      return (
        currentUser !== null &&
        payload.notificationCreated.recipientId === String(currentUser.id)
      );
    },
    resolve: (payload: NotificationCreatedPayload) =>
      payload.notificationCreated,
  })
  notificationCreated(): AsyncIterableIterator<NotificationCreatedPayload> {
    return this.notificationsService.notificationCreatedIterator();
  }
}
