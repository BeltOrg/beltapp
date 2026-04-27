import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { GraphqlAuthGuard } from '../auth/graphql-auth.guard';
import { CancelOrderInput } from './dto/cancel-order.input';
import { CreateOrderInput } from './dto/create-order.input';
import { Order } from './dto/order.model';
import { OrderStatus } from './enums/order-status.enum';
import { mapOrder } from './orders.mapper';
import { OrderWorkflowService } from './order-workflow.service';

@Resolver(() => Order)
@UseGuards(GraphqlAuthGuard)
export class OrdersResolver {
  constructor(private readonly orderWorkflowService: OrderWorkflowService) {}

  @Query(() => [Order])
  async myOwnerOrders(
    @CurrentUserId() currentUserId: number,
    @Args('statuses', { type: () => [OrderStatus], nullable: true })
    statuses?: OrderStatus[],
  ): Promise<Order[]> {
    return (
      await this.orderWorkflowService.findOwnerOrders(currentUserId, statuses)
    ).map(mapOrder);
  }

  @Query(() => [Order])
  async myWalkerOrders(
    @CurrentUserId() currentUserId: number,
    @Args('statuses', { type: () => [OrderStatus], nullable: true })
    statuses?: OrderStatus[],
  ): Promise<Order[]> {
    return (
      await this.orderWorkflowService.findWalkerOrders(currentUserId, statuses)
    ).map(mapOrder);
  }

  @Query(() => [Order])
  async availableOrders(): Promise<Order[]> {
    return (await this.orderWorkflowService.findAvailableOrders()).map(
      mapOrder,
    );
  }

  @Query(() => Order)
  async order(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Order> {
    return mapOrder(
      await this.orderWorkflowService.requireVisibleOrder(
        Number(id),
        currentUserId,
      ),
    );
  }

  @Mutation(() => Order)
  async createOrder(
    @CurrentUserId() currentUserId: number,
    @Args('input') input: CreateOrderInput,
  ): Promise<Order> {
    return mapOrder(
      await this.orderWorkflowService.create(currentUserId, input),
    );
  }

  @Mutation(() => Order)
  async acceptOrder(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Order> {
    return mapOrder(
      await this.orderWorkflowService.accept(Number(id), currentUserId),
    );
  }

  @Mutation(() => Order)
  async startOrder(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Order> {
    return mapOrder(
      await this.orderWorkflowService.start(Number(id), currentUserId),
    );
  }

  @Mutation(() => Order)
  async finishOrder(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Order> {
    return mapOrder(
      await this.orderWorkflowService.finish(Number(id), currentUserId),
    );
  }

  @Mutation(() => Order)
  async cancelOrder(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { nullable: true }) input?: CancelOrderInput,
  ): Promise<Order> {
    return mapOrder(
      await this.orderWorkflowService.cancel(
        Number(id),
        currentUserId,
        input?.reason,
      ),
    );
  }

  @Mutation(() => Order)
  async markOrderPaid(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Order> {
    return mapOrder(
      await this.orderWorkflowService.markPaid(Number(id), currentUserId),
    );
  }
}
