import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { BeltRealtimeService } from '../belt/events/belt-realtime.service';
import { BeltEventType } from '../belt/events/belt-event-type.enum';
import { DogEntity } from '../dogs/entities/dog.entity';
import { UserEntity } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { CreateOrderInput } from './dto/create-order.input';
import { OrderEntity } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { canTransitionOrderStatus } from './order-state-machine';

@Injectable()
export class OrderWorkflowService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(DogEntity)
    private readonly dogsRepository: Repository<DogEntity>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly beltRealtimeService: BeltRealtimeService,
  ) {}

  async findOwnerOrders(
    ownerId: number,
    statuses?: OrderStatus[],
  ): Promise<OrderEntity[]> {
    return this.ordersRepository.find({
      where:
        statuses && statuses.length > 0
          ? statuses.map((status) => ({ ownerId, status }))
          : { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findWalkerOrders(
    walkerId: number,
    statuses?: OrderStatus[],
  ): Promise<OrderEntity[]> {
    return this.ordersRepository.find({
      where:
        statuses && statuses.length > 0
          ? statuses.map((status) => ({ walkerId, status }))
          : { walkerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAvailableOrders(): Promise<OrderEntity[]> {
    return this.ordersRepository.find({
      where: { status: OrderStatus.CREATED, walkerId: IsNull() },
      order: { createdAt: 'ASC' },
    });
  }

  async requireVisibleOrder(
    id: number,
    viewerId: number,
  ): Promise<OrderEntity> {
    const order = await this.requireOrder(id);

    if (
      order.ownerId !== viewerId &&
      order.walkerId !== viewerId &&
      order.status !== OrderStatus.CREATED
    ) {
      throw new ForbiddenException({
        code: 'ORDER_FORBIDDEN',
        message: 'You cannot view this order.',
      });
    }

    return order;
  }

  async create(ownerId: number, input: CreateOrderInput): Promise<OrderEntity> {
    const owner = await this.usersService.requireEntityById(ownerId);
    this.assertRole(owner, UserRole.OWNER, 'OWNER_ROLE_REQUIRED');

    const dog = await this.dogsRepository.findOneBy({
      id: Number(input.dogId),
    });
    if (!dog) {
      throw new NotFoundException({
        code: 'DOG_NOT_FOUND',
        message: 'Dog was not found.',
      });
    }

    if (dog.ownerId !== ownerId) {
      throw new ForbiddenException({
        code: 'DOG_FORBIDDEN',
        message: 'You can only create orders for your own dogs.',
      });
    }

    if (input.endTime <= input.startTime) {
      throw new BadRequestException({
        code: 'ORDER_INVALID_TIME_RANGE',
        message: 'Order end time must be after start time.',
      });
    }

    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        ownerId,
        dogId: dog.id,
        status: OrderStatus.CREATED,
        priceAmount: input.priceAmount,
        priceCurrency: input.priceCurrency ?? 'EUR',
        locationLat: input.locationLat,
        locationLng: input.locationLng,
        locationAddress: input.locationAddress,
        startTime: input.startTime,
        endTime: input.endTime,
      }),
    );

    await this.beltRealtimeService.publishOrderEvent(
      BeltEventType.ORDER_CREATED,
      order,
    );

    return order;
  }

  async accept(id: number, walkerId: number): Promise<OrderEntity> {
    const walker = await this.usersService.requireEntityById(walkerId);
    this.assertRole(walker, UserRole.WALKER, 'WALKER_ROLE_REQUIRED');

    const result = await this.dataSource
      .createQueryBuilder()
      .update(OrderEntity)
      .set({
        status: OrderStatus.ACCEPTED,
        walkerId,
        acceptedAt: () => 'CURRENT_TIMESTAMP',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id', { id })
      .andWhere('status = :status', { status: OrderStatus.CREATED })
      .andWhere('walker_id IS NULL')
      .andWhere('owner_id != :walkerId', { walkerId })
      .returning('id')
      .execute();

    if ((result.affected ?? 0) !== 1) {
      const order = await this.ordersRepository.findOneBy({ id });
      if (!order) {
        throw this.orderNotFound();
      }

      if (order.ownerId === walkerId) {
        throw new ForbiddenException({
          code: 'ORDER_OWNER_CANNOT_ACCEPT',
          message: 'Owners cannot accept their own orders.',
        });
      }

      if (order.status !== OrderStatus.CREATED || order.walkerId !== null) {
        throw new ConflictException({
          code: 'ORDER_ALREADY_TAKEN',
          message: 'Order was already accepted.',
        });
      }

      throw this.invalidTransition(order.status, OrderStatus.ACCEPTED);
    }

    const order = await this.requireOrder(id);
    await this.beltRealtimeService.publishOrderEvent(
      BeltEventType.ORDER_ACCEPTED,
      order,
    );

    return order;
  }

  async start(id: number, walkerId: number): Promise<OrderEntity> {
    const order = await this.requireOrder(id);
    this.assertAssignedWalker(order, walkerId);
    this.assertTransition(order.status, OrderStatus.STARTED);

    order.status = OrderStatus.STARTED;
    order.startedAt = new Date();
    const savedOrder = await this.ordersRepository.save(order);
    await this.beltRealtimeService.publishOrderEvent(
      BeltEventType.ORDER_STARTED,
      savedOrder,
    );

    return savedOrder;
  }

  async finish(id: number, walkerId: number): Promise<OrderEntity> {
    const order = await this.requireOrder(id);
    this.assertAssignedWalker(order, walkerId);
    this.assertTransition(order.status, OrderStatus.FINISHED);

    order.status = OrderStatus.FINISHED;
    order.finishedAt = new Date();
    const savedOrder = await this.ordersRepository.save(order);
    await this.beltRealtimeService.publishOrderEvent(
      BeltEventType.ORDER_FINISHED,
      savedOrder,
    );

    return savedOrder;
  }

  async cancel(
    id: number,
    actorId: number,
    reason?: string | null,
  ): Promise<OrderEntity> {
    void reason;
    const order = await this.requireOrder(id);

    if (order.ownerId !== actorId && order.walkerId !== actorId) {
      throw new ForbiddenException({
        code: 'ORDER_FORBIDDEN',
        message: 'Only an order participant can cancel this order.',
      });
    }

    if (order.walkerId === actorId && order.status !== OrderStatus.ACCEPTED) {
      throw new ForbiddenException({
        code: 'ORDER_WALKER_CANCEL_FORBIDDEN',
        message: 'Walkers can only cancel accepted orders.',
      });
    }

    this.assertTransition(order.status, OrderStatus.CANCELLED);
    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    const savedOrder = await this.ordersRepository.save(order);
    await this.beltRealtimeService.publishOrderEvent(
      BeltEventType.ORDER_CANCELLED,
      savedOrder,
    );

    return savedOrder;
  }

  async markPaid(id: number, ownerId: number): Promise<OrderEntity> {
    const order = await this.requireOrder(id);
    if (order.ownerId !== ownerId) {
      throw new ForbiddenException({
        code: 'ORDER_FORBIDDEN',
        message: 'Only the owner can mark this order as paid.',
      });
    }

    this.assertTransition(order.status, OrderStatus.PAID);
    order.status = OrderStatus.PAID;
    order.paidAt = new Date();
    const savedOrder = await this.ordersRepository.save(order);
    await this.beltRealtimeService.publishOrderEvent(
      BeltEventType.ORDER_PAID,
      savedOrder,
    );

    return savedOrder;
  }

  private async requireOrder(id: number): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOneBy({ id });
    if (!order) {
      throw this.orderNotFound();
    }

    return order;
  }

  private assertAssignedWalker(order: OrderEntity, walkerId: number): void {
    if (order.walkerId !== walkerId) {
      throw new ForbiddenException({
        code: 'ORDER_ASSIGNED_WALKER_REQUIRED',
        message: 'Only the assigned walker can perform this action.',
      });
    }
  }

  private assertRole(user: UserEntity, role: UserRole, code: string): void {
    if (!user.roles.includes(role)) {
      throw new ForbiddenException({
        code,
        message: `${role} role is required for this action.`,
      });
    }
  }

  private assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (!canTransitionOrderStatus(from, to)) {
      throw this.invalidTransition(from, to);
    }
  }

  private invalidTransition(from: OrderStatus, to: OrderStatus): Error {
    return new ConflictException({
      code: 'ORDER_INVALID_TRANSITION',
      message: `Cannot transition order from ${from} to ${to}.`,
    });
  }

  private orderNotFound(): Error {
    return new NotFoundException({
      code: 'ORDER_NOT_FOUND',
      message: 'Order was not found.',
    });
  }
}
