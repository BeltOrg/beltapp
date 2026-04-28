jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('typeorm', () => {
  const decorator = () => () => undefined;

  return {
    Check: decorator,
    Column: decorator,
    CreateDateColumn: decorator,
    Entity: decorator,
    Index: decorator,
    IsNull: () => ({ type: 'is-null' }),
    JoinColumn: decorator,
    ManyToOne: decorator,
    PrimaryGeneratedColumn: decorator,
    Repository: class Repository {},
    Unique: decorator,
    UpdateDateColumn: decorator,
  };
});

import { OrderStatus } from '../orders/enums/order-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationsService } from './notifications.service';
import type { OrderEntity } from '../orders/entities/order.entity';
import type { RealtimePubSubService } from '../realtime/realtime-pubsub.service';
import type { Repository } from 'typeorm';
import type { UserEntity } from '../users/entities/user.entity';

function buildOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  return {
    id: 10,
    ownerId: 1,
    walkerId: null,
    dogId: 5,
    status: OrderStatus.CREATED,
    priceAmount: 1200,
    priceCurrency: 'EUR',
    locationLat: 59.437,
    locationLng: 24.7536,
    locationAddress: 'Tallinn',
    startTime: new Date('2026-05-01T10:00:00.000Z'),
    endTime: new Date('2026-05-01T11:00:00.000Z'),
    createdAt: new Date('2026-04-27T10:00:00.000Z'),
    updatedAt: new Date('2026-04-27T10:00:00.000Z'),
    acceptedAt: null,
    startedAt: null,
    finishedAt: null,
    cancelledAt: null,
    paidAt: null,
    owner: undefined!,
    walker: null,
    dog: undefined!,
    ...overrides,
  };
}

function buildNotification(
  overrides: Partial<NotificationEntity> = {},
): NotificationEntity {
  return {
    id: 22,
    recipientId: 2,
    type: NotificationType.AVAILABLE_WALK_CREATED,
    title: 'New walk available',
    body: 'New walk at Tallinn.',
    actionUrl: '/orders/10',
    orderId: 10,
    actorId: null,
    readAt: null,
    createdAt: new Date('2026-04-28T11:00:00.000Z'),
    recipient: undefined!,
    order: undefined!,
    actor: undefined!,
    ...overrides,
  };
}

describe('NotificationsService', () => {
  function createHarness() {
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 2, roles: [UserRole.WALKER] },
        { id: 3, roles: [UserRole.WALKER] },
      ]),
      where: jest.fn().mockReturnThis(),
    };
    const notificationsRepositoryMock = {
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn((notification: Partial<NotificationEntity>) =>
        buildNotification(notification),
      ),
      find: jest.fn().mockResolvedValue([buildNotification()]),
      findOneBy: jest.fn().mockResolvedValue(buildNotification()),
      save: jest.fn(async (notification: NotificationEntity) => notification),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const usersRepositoryMock = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    const pubSubServiceMock = {
      asyncIterator: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const service = new NotificationsService(
      notificationsRepositoryMock as unknown as Repository<NotificationEntity>,
      usersRepositoryMock as unknown as Repository<UserEntity>,
      pubSubServiceMock as unknown as RealtimePubSubService,
    );

    return {
      notificationsRepository: notificationsRepositoryMock,
      pubSubService: pubSubServiceMock,
      queryBuilder,
      service,
    };
  }

  it('persists and publishes available-walk notifications for walkers', async () => {
    const { notificationsRepository, pubSubService, queryBuilder, service } =
      createHarness();

    await service.notifyOrderCreated(buildOrder());

    expect(queryBuilder.where).toHaveBeenCalledWith(
      ':role = ANY(belt_user.roles)',
      { role: UserRole.WALKER },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'belt_user.id != :ownerId',
      { ownerId: 1 },
    );
    expect(notificationsRepository.save).toHaveBeenCalledTimes(2);
    expect(pubSubService.publish).toHaveBeenCalledWith(
      'belt.notification.created',
      expect.objectContaining({
        notificationCreated: expect.objectContaining({
          recipientId: '2',
          type: NotificationType.AVAILABLE_WALK_CREATED,
        }),
      }),
    );
  });

  it('marks a notification read for its recipient', async () => {
    const { notificationsRepository, service } = createHarness();

    const notification = await service.markRead(22, 2);

    expect(notificationsRepository.findOneBy).toHaveBeenCalledWith({
      id: 22,
      recipientId: 2,
    });
    expect(notification.readAt).toBeInstanceOf(Date);
    expect(notificationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 22, readAt: expect.any(Date) }),
    );
  });

  it('marks all unread notifications read for a recipient', async () => {
    const { notificationsRepository, service } = createHarness();

    await expect(service.markAllRead(2)).resolves.toBe(true);
    expect(notificationsRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 2 }),
      expect.objectContaining({ readAt: expect.any(Date) }),
    );
  });
});
