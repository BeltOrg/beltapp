import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrderEntity } from '../orders/entities/order.entity';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsResolver } from './reviews.resolver';
import { ReviewsService } from './reviews.service';

export const REVIEWS_GRAPHQL_RESOLVERS = [ReviewsResolver] as const;

@Module({
  imports: [TypeOrmModule.forFeature([ReviewEntity, OrderEntity]), AuthModule],
  providers: [ReviewsService, ...REVIEWS_GRAPHQL_RESOLVERS],
  exports: [ReviewsService, TypeOrmModule],
})
export class ReviewsModule {}
