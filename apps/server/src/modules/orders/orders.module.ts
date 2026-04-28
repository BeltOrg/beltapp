import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BeltRealtimeModule } from '../belt/events/belt-realtime.module';
import { DogEntity } from '../dogs/entities/dog.entity';
import { UsersModule } from '../users/users.module';
import { OrderEntity } from './entities/order.entity';
import { OrdersResolver } from './orders.resolver';
import { OrderWorkflowService } from './order-workflow.service';

export const ORDERS_GRAPHQL_RESOLVERS = [OrdersResolver] as const;

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, DogEntity]),
    AuthModule,
    BeltRealtimeModule,
    UsersModule,
  ],
  providers: [OrderWorkflowService, ...ORDERS_GRAPHQL_RESOLVERS],
  exports: [OrderWorkflowService, TypeOrmModule],
})
export class OrdersModule {}
