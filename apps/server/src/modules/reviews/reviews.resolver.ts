import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { GraphqlAuthGuard } from '../auth/graphql-auth.guard';
import { CreateReviewInput } from './dto/create-review.input';
import { Review } from './dto/review.model';
import { mapReview } from './reviews.mapper';
import { ReviewsService } from './reviews.service';

@Resolver(() => Review)
@UseGuards(GraphqlAuthGuard)
export class ReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Query(() => [Review])
  async myReviews(@CurrentUserId() currentUserId: number): Promise<Review[]> {
    return (await this.reviewsService.findMine(currentUserId)).map(mapReview);
  }

  @Mutation(() => Review)
  async createOrderReview(
    @CurrentUserId() currentUserId: number,
    @Args('orderId', { type: () => ID }) orderId: string,
    @Args('input') input: CreateReviewInput,
  ): Promise<Review> {
    return mapReview(
      await this.reviewsService.create(Number(orderId), currentUserId, input),
    );
  }
}
