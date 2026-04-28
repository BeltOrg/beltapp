import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { logStructuredEvent } from '../../logging/structured-log';
import { OrderEntity } from '../orders/entities/order.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { RealtimePubSubService } from '../realtime/realtime-pubsub.service';
import { UserEntity } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import {
  BeltNotification,
  NotificationCreatedPayload,
} from './dto/notification.model';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { mapNotification } from './notifications.mapper';

const NOTIFICATION_CREATED_TOPIC = 'belt.notification.created';
const DEFAULT_NOTIFICATION_LIMIT = 20;
const MAX_NOTIFICATION_LIMIT = 50;

type CreateNotificationInput = {
  actionUrl: string | null;
  actorId?: number | null;
  body: string;
  orderId?: number | null;
  recipientId: number;
  title: string;
  type: NotificationType;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepository: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly pubSubService: RealtimePubSubService,
  ) {}

  notificationCreatedIterator(): AsyncIterableIterator<NotificationCreatedPayload> {
    return this.pubSubService.asyncIterator<NotificationCreatedPayload>(
      NOTIFICATION_CREATED_TOPIC,
    );
  }

  async findMine(
    recipientId: number,
    limit = DEFAULT_NOTIFICATION_LIMIT,
  ): Promise<NotificationEntity[]> {
    return this.notificationsRepository.find({
      where: { recipientId },
      order: { createdAt: 'DESC' },
      take: this.normalizeLimit(limit),
    });
  }

  async countUnread(recipientId: number): Promise<number> {
    return this.notificationsRepository.count({
      where: { recipientId, readAt: IsNull() },
    });
  }

  async markRead(id: number, recipientId: number): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.findOneBy({
      id,
      recipientId,
    });

    if (!notification) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification was not found.',
      });
    }

    if (notification.readAt) {
      return notification;
    }

    notification.readAt = new Date();
    return this.notificationsRepository.save(notification);
  }

  async markAllRead(recipientId: number): Promise<boolean> {
    await this.notificationsRepository.update(
      { recipientId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return true;
  }

  async notifyOrderCreated(order: OrderEntity): Promise<void> {
    const walkers = await this.usersRepository
      .createQueryBuilder('belt_user')
      .where(':role = ANY(belt_user.roles)', { role: UserRole.WALKER })
      .andWhere('belt_user.id != :ownerId', { ownerId: order.ownerId })
      .getMany();

    await Promise.all(
      walkers.map((walker) =>
        this.safeCreate({
          actionUrl: `/orders/${order.id}`,
          body: `New walk at ${order.locationAddress}.`,
          orderId: order.id,
          recipientId: walker.id,
          title: 'New walk available',
          type: NotificationType.AVAILABLE_WALK_CREATED,
        }),
      ),
    );
  }

  async notifyOrderAccepted(order: OrderEntity): Promise<void> {
    await this.safeCreate({
      actionUrl: `/orders/${order.id}`,
      actorId: order.walkerId,
      body: 'A walker accepted your walk.',
      orderId: order.id,
      recipientId: order.ownerId,
      title: 'Walk accepted',
      type: NotificationType.ORDER_ACCEPTED,
    });
  }

  async notifyOrderStarted(order: OrderEntity): Promise<void> {
    await this.safeCreate({
      actionUrl: `/orders/${order.id}`,
      actorId: order.walkerId,
      body: 'Your walk has started.',
      orderId: order.id,
      recipientId: order.ownerId,
      title: 'Walk started',
      type: NotificationType.ORDER_STARTED,
    });
  }

  async notifyOrderFinished(order: OrderEntity): Promise<void> {
    await this.safeCreate({
      actionUrl: `/orders/${order.id}`,
      actorId: order.walkerId,
      body: 'Your walk has finished.',
      orderId: order.id,
      recipientId: order.ownerId,
      title: 'Walk finished',
      type: NotificationType.ORDER_FINISHED,
    });
  }

  async notifyOrderCancelled(
    order: OrderEntity,
    actorId: number,
  ): Promise<void> {
    const recipientId =
      actorId === order.ownerId ? order.walkerId : order.ownerId;

    if (recipientId === null) {
      return;
    }

    await this.safeCreate({
      actionUrl: `/orders/${order.id}`,
      actorId,
      body: 'A walk was cancelled.',
      orderId: order.id,
      recipientId,
      title: 'Walk cancelled',
      type: NotificationType.ORDER_CANCELLED,
    });
  }

  async notifyOrderPaid(order: OrderEntity): Promise<void> {
    if (order.walkerId === null) {
      return;
    }

    await this.safeCreate({
      actionUrl: `/orders/${order.id}`,
      actorId: order.ownerId,
      body: 'A finished walk was marked paid.',
      orderId: order.id,
      recipientId: order.walkerId,
      title: 'Walk paid',
      type: NotificationType.ORDER_PAID,
    });
  }

  async notifyReviewCreated(review: ReviewEntity): Promise<void> {
    await this.safeCreate({
      actionUrl: `/orders/${review.orderId}`,
      actorId: review.reviewerId,
      body: 'You received a new review.',
      orderId: review.orderId,
      recipientId: review.revieweeId,
      title: 'New review',
      type: NotificationType.REVIEW_CREATED,
    });
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isFinite(limit)) {
      return DEFAULT_NOTIFICATION_LIMIT;
    }

    return Math.min(Math.max(Math.trunc(limit), 1), MAX_NOTIFICATION_LIMIT);
  }

  private async safeCreate(input: CreateNotificationInput): Promise<void> {
    try {
      await this.create(input);
    } catch (error) {
      logStructuredEvent(
        this.logger,
        'warn',
        'notification_create_failed',
        {
          orderId: input.orderId ?? null,
          recipientId: input.recipientId,
          type: input.type,
        },
        error,
      );
    }
  }

  private async create(
    input: CreateNotificationInput,
  ): Promise<BeltNotification> {
    const notification = await this.notificationsRepository.save(
      this.notificationsRepository.create({
        actionUrl: input.actionUrl,
        actorId: input.actorId ?? null,
        body: input.body,
        orderId: input.orderId ?? null,
        readAt: null,
        recipientId: input.recipientId,
        title: input.title,
        type: input.type,
      }),
    );
    const mappedNotification = mapNotification(notification);

    await this.pubSubService.publish<NotificationCreatedPayload>(
      NOTIFICATION_CREATED_TOPIC,
      { notificationCreated: mappedNotification },
    );

    return mappedNotification;
  }
}
