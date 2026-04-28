jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('typeorm', () => {
  const decorator = () => () => undefined;

  return {
    Column: decorator,
    CreateDateColumn: decorator,
    DataSource: class DataSource {},
    Entity: decorator,
    Index: decorator,
    IsNull: () => ({ type: 'is-null' }),
    JoinColumn: decorator,
    ManyToOne: decorator,
    PrimaryGeneratedColumn: decorator,
    Repository: class Repository {},
    UpdateDateColumn: decorator,
  };
});

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrderEntity } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { OrderWorkflowService } from './order-workflow.service';
import type { DataSource, Repository } from 'typeorm';
import type { DogEntity } from '../dogs/entities/dog.entity';
import type { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';
import type { BeltRealtimeService } from '../belt/events/belt-realtime.service';
import { BeltEventType } from '../belt/events/belt-event-type.enum';
import type { NotificationsService } from '../notifications/notifications.service';

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

describe('OrderWorkflowService', () => {
  function createHarness(options: {
    affected?: number;
    order?: OrderEntity | null;
    walkerRoles?: UserRole[];
  }) {
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: options.affected ?? 1 }),
    };
    const ordersRepositoryMock = {
      findOneBy: jest
        .fn()
        .mockResolvedValue(
          options.order === undefined ? buildOrder() : options.order,
        ),
      save: jest.fn(async (order: OrderEntity) => order),
    };
    const dogsRepositoryMock = {
      findOneBy: jest.fn(),
    };
    const dataSourceMock = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    const usersServiceMock = {
      requireEntityById: jest.fn().mockResolvedValue({
        id: 2,
        roles: options.walkerRoles ?? [UserRole.WALKER],
      }),
    };
    const beltRealtimeServiceMock = {
      publishOrderEvent: jest.fn().mockResolvedValue(undefined),
    };
    const notificationsServiceMock = {
      notifyOrderAccepted: jest.fn().mockResolvedValue(undefined),
      notifyOrderCancelled: jest.fn().mockResolvedValue(undefined),
      notifyOrderCreated: jest.fn().mockResolvedValue(undefined),
      notifyOrderFinished: jest.fn().mockResolvedValue(undefined),
      notifyOrderPaid: jest.fn().mockResolvedValue(undefined),
      notifyOrderStarted: jest.fn().mockResolvedValue(undefined),
    };

    const service = new OrderWorkflowService(
      ordersRepositoryMock as unknown as Repository<OrderEntity>,
      dogsRepositoryMock as unknown as Repository<DogEntity>,
      dataSourceMock as unknown as DataSource,
      usersServiceMock as unknown as UsersService,
      beltRealtimeServiceMock as unknown as BeltRealtimeService,
      notificationsServiceMock as unknown as NotificationsService,
    );

    return {
      dataSource: dataSourceMock,
      ordersRepository: ordersRepositoryMock,
      queryBuilder,
      service,
      usersService: usersServiceMock,
      beltRealtimeService: beltRealtimeServiceMock,
      notificationsService: notificationsServiceMock,
    };
  }

  it('accepts an order through one conditional update', async () => {
    const acceptedOrder = buildOrder({
      status: OrderStatus.ACCEPTED,
      walkerId: 2,
      acceptedAt: new Date('2026-04-27T10:05:00.000Z'),
    });
    const {
      beltRealtimeService,
      notificationsService,
      ordersRepository,
      queryBuilder,
      service,
    } = createHarness({
      affected: 1,
      order: acceptedOrder,
    });

    await expect(service.accept(10, 2)).resolves.toMatchObject({
      status: OrderStatus.ACCEPTED,
      walkerId: 2,
    });

    expect(queryBuilder.update).toHaveBeenCalledWith(OrderEntity);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('status = :status', {
      status: OrderStatus.CREATED,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('walker_id IS NULL');
    expect(ordersRepository.findOneBy).toHaveBeenCalledWith({ id: 10 });
    expect(beltRealtimeService.publishOrderEvent).toHaveBeenCalledWith(
      BeltEventType.ORDER_ACCEPTED,
      acceptedOrder,
    );
    expect(notificationsService.notifyOrderAccepted).toHaveBeenCalledWith(
      acceptedOrder,
    );
  });

  it('returns a stable conflict when another walker already accepted', async () => {
    const { service } = createHarness({
      affected: 0,
      order: buildOrder({
        status: OrderStatus.ACCEPTED,
        walkerId: 3,
      }),
    });

    await expect(service.accept(10, 2)).rejects.toMatchObject({
      constructor: ConflictException,
      response: expect.objectContaining({
        code: 'ORDER_ALREADY_TAKEN',
      }),
    });
  });

  it('does not let an owner accept their own order', async () => {
    const { service } = createHarness({
      affected: 0,
      order: buildOrder({ ownerId: 2 }),
    });

    await expect(service.accept(10, 2)).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: expect.objectContaining({
        code: 'ORDER_OWNER_CANNOT_ACCEPT',
      }),
    });
  });

  it('requires the walker role to accept orders', async () => {
    const { service } = createHarness({
      walkerRoles: [UserRole.OWNER],
    });

    await expect(service.accept(10, 2)).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: expect.objectContaining({
        code: 'WALKER_ROLE_REQUIRED',
      }),
    });
  });

  it('raises not found for missing accept targets', async () => {
    const { service } = createHarness({
      affected: 0,
      order: null,
    });

    await expect(service.accept(10, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
