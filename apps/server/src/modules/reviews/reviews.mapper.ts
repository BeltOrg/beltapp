import { Review } from './dto/review.model';
import { ReviewEntity } from './entities/review.entity';

export function mapReview(entity: ReviewEntity): Review {
  return {
    id: String(entity.id),
    orderId: String(entity.orderId),
    reviewerId: String(entity.reviewerId),
    revieweeId: String(entity.revieweeId),
    rating: entity.rating,
    comment: entity.comment,
    createdAt: entity.createdAt,
  };
}
