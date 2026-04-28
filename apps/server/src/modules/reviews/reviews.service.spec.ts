jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('typeorm', () => {
  const decorator = () => () => undefined;

  return {
    Check: decorator,
    Column: decorator,
    CreateDateColumn: decorator,
    Entity: decorator,
    Index: decorator,
    JoinColumn: decorator,
    ManyToOne: decorator,
    PrimaryGeneratedColumn: decorator,
    Unique: decorator,
    UpdateDateColumn: decorator,
  };
});

import { BeltEventType } from '../belt/events/belt-event-type.enum';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

function buildOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  return {
    id: 10,
    ownerId: 1,
    walkerId: 2,
    dogId: 5,
    status: OrderStatus.FINISHED,
    priceAmount: 1200,
    priceCurrency: 'EUR',
    locationLat: 59.437,
    locationLng: 24.7536,
    locationAddress: 'Tallinn',
    startTime: new Date('2026-05-01T10:00:00.000Z'),
    endTime: new Date('2026-05-01T11:00:00.000Z'),
    acceptedAt: new Date('2026-05-01T09:50:00.000Z'),
    startedAt: new Date('2026-05-01T10:00:00.000Z'),
    finishedAt: new Date('2026-05-01T11:00:00.000Z'),
    cancelledAt: null,
    paidAt: null,
    createdAt: new Date('2026-04-27T10:00:00.000Z'),
    updatedAt: new Date('2026-04-27T10:00:00.000Z'),
    owner: undefined!,
    walker: undefined!,
    dog: undefined!,
    ...overrides,
  };
}

function buildReview(overrides: Partial<ReviewEntity> = {}): ReviewEntity {
  return {
    id: 15,
    orderId: 10,
    reviewerId: 1,
    revieweeId: 2,
    rating: 5,
    comment: 'Great walk',
    createdAt: new Date('2026-05-01T11:15:00.000Z'),
    order: undefined!,
    reviewer: undefined!,
    reviewee: undefined!,
    ...overrides,
  };
}

function buildUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 2,
    phone: '+15550000002',
    roles: [UserRole.WALKER],
    rating: 0,
    isVerified: false,
    createdAt: new Date('2026-04-27T10:00:00.000Z'),
    updatedAt: new Date('2026-04-27T10:00:00.000Z'),
    ...overrides,
  };
}

describe('ReviewsService', () => {
  function createHarness() {
    const ordersRepositoryMock = {
      findOneBy: jest.fn().mockResolvedValue(buildOrder()),
    };
    const reviewsRepositoryMock = {
      average: jest.fn().mockResolvedValue(4.5),
      create: jest.fn((review: Partial<ReviewEntity>) => buildReview(review)),
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (review: ReviewEntity) => review),
    };
    const usersRepositoryMock = {
      findOneBy: jest.fn().mockResolvedValue(buildUser()),
      save: jest.fn(async (user: UserEntity) => user),
    };
    const beltRealtimeServiceMock = {
      publishReviewEvent: jest.fn().mockResolvedValue(undefined),
      publishUserEvent: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ReviewsService(
      reviewsRepositoryMock,
      ordersRepositoryMock,
      usersRepositoryMock,
      beltRealtimeServiceMock,
    );

    return {
      beltRealtimeService: beltRealtimeServiceMock,
      reviewsRepository: reviewsRepositoryMock,
      service,
      usersRepository: usersRepositoryMock,
    };
  }

  it('publishes review and reviewee rating events after a review is created', async () => {
    const { beltRealtimeService, reviewsRepository, service, usersRepository } =
      createHarness();

    const review = await service.create(10, 1, {
      rating: 5,
      comment: 'Great walk',
    });

    expect(reviewsRepository.average).toHaveBeenCalledWith('rating', {
      revieweeId: 2,
    });
    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, rating: 4.5 }),
    );
    expect(beltRealtimeService.publishReviewEvent).toHaveBeenCalledWith(
      BeltEventType.REVIEW_CREATED,
      review,
    );
    expect(beltRealtimeService.publishUserEvent).toHaveBeenCalledWith(
      BeltEventType.USER_UPDATED,
      expect.objectContaining({ id: 2, rating: 4.5 }),
    );
  });
});
