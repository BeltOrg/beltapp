import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { CreateReviewInput } from './dto/create-review.input';
import { ReviewEntity } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewsRepository: Repository<ReviewEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
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

    return this.reviewsRepository.save(
      this.reviewsRepository.create({
        orderId,
        reviewerId,
        revieweeId,
        rating: input.rating,
        comment: input.comment ?? null,
      }),
    );
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
