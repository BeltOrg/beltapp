import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BeltEventType } from '../belt/events/belt-event-type.enum';
import { BeltRealtimeService } from '../belt/events/belt-realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { UserEntity } from '../users/entities/user.entity';
import { CreateReviewInput } from './dto/create-review.input';
import { ReviewEntity } from './entities/review.entity';

type ReviewsRepository = {
  average(
    columnName: 'rating',
    where: { revieweeId: number },
  ): Promise<number | null>;
  create(review: Partial<ReviewEntity>): ReviewEntity;
  find(options: {
    where: Array<{ reviewerId: number } | { revieweeId: number }>;
    order: { createdAt: 'DESC' };
  }): Promise<ReviewEntity[]>;
  findOneBy(where: {
    orderId: number;
    reviewerId: number;
  }): Promise<ReviewEntity | null>;
  save(review: ReviewEntity): Promise<ReviewEntity>;
};

type OrdersRepository = {
  findOneBy(where: { id: number }): Promise<OrderEntity | null>;
};

type UsersRepository = {
  findOneBy(where: { id: number }): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<UserEntity>;
};

type ReviewEventPublisher = Pick<
  BeltRealtimeService,
  'publishReviewEvent' | 'publishUserEvent'
>;

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewsRepository: ReviewsRepository,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: OrdersRepository,
    @InjectRepository(UserEntity)
    private readonly usersRepository: UsersRepository,
    @Inject(BeltRealtimeService)
    private readonly beltRealtimeService: ReviewEventPublisher,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findMine(userId: number): Promise<ReviewEntity[]> {
    return this.reviewsRepository.find({
      where: [{ reviewerId: userId }, { revieweeId: userId }],
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    orderId: number,
    reviewerId: number,
    input: CreateReviewInput,
  ): Promise<ReviewEntity> {
    const order = await this.ordersRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order was not found.',
      });
    }

    if (
      order.status !== OrderStatus.FINISHED &&
      order.status !== OrderStatus.PAID
    ) {
      throw new ConflictException({
        code: 'REVIEW_ORDER_NOT_COMPLETE',
        message: 'Reviews can only be created after a walk is complete.',
      });
    }

    const revieweeId = this.resolveRevieweeId(order, reviewerId);
    const existingReview = await this.reviewsRepository.findOneBy({
      orderId,
      reviewerId,
    });

    if (existingReview) {
      throw new ConflictException({
        code: 'REVIEW_ALREADY_EXISTS',
        message: 'You already reviewed this order.',
      });
    }

    const review = await this.reviewsRepository.save(
      this.reviewsRepository.create({
        orderId,
        reviewerId,
        revieweeId,
        rating: input.rating,
        comment: input.comment ?? null,
      }),
    );
    const updatedReviewee = await this.updateRevieweeRating(revieweeId);

    await this.beltRealtimeService.publishReviewEvent(
      BeltEventType.REVIEW_CREATED,
      review,
    );
    await this.notificationsService.notifyReviewCreated(review);
    if (updatedReviewee) {
      await this.beltRealtimeService.publishUserEvent(
        BeltEventType.USER_UPDATED,
        updatedReviewee,
      );
    }

    return review;
  }

  private async updateRevieweeRating(
    revieweeId: number,
  ): Promise<UserEntity | null> {
    const averageRating =
      (await this.reviewsRepository.average('rating', { revieweeId })) ?? 0;
    const reviewee = await this.usersRepository.findOneBy({ id: revieweeId });
    if (!reviewee) {
      return null;
    }

    reviewee.rating = averageRating;
    return this.usersRepository.save(reviewee);
  }

  private resolveRevieweeId(order: OrderEntity, reviewerId: number): number {
    if (order.ownerId === reviewerId && order.walkerId !== null) {
      return order.walkerId;
    }

    if (order.walkerId === reviewerId) {
      return order.ownerId;
    }

    throw new ForbiddenException({
      code: 'REVIEW_FORBIDDEN',
      message: 'Only order participants can review.',
    });
  }
}
