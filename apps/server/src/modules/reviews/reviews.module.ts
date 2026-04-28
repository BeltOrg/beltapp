import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BeltRealtimeModule } from '../belt/events/belt-realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsResolver } from './reviews.resolver';
import { ReviewsService } from './reviews.service';

export const REVIEWS_GRAPHQL_RESOLVERS = [ReviewsResolver] as const;

@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewEntity, OrderEntity, UserEntity]),
    AuthModule,
    BeltRealtimeModule,
    NotificationsModule,
  ],
  providers: [ReviewsService, ...REVIEWS_GRAPHQL_RESOLVERS],
  exports: [ReviewsService, TypeOrmModule],
})
export class ReviewsModule {}
