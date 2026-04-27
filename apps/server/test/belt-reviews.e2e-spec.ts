import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import {
  OWNER_ID,
  WALKER_ONE_ID,
  WALKER_TWO_ID,
  createFinishedOrder,
  createOrder,
  expectGraphqlErrorCodes,
  requestCreateReview,
  resetBeltFixture,
} from './belt-e2e-fixture';
import { createE2eApp } from './e2e-app';

describe('Belt reviews (e2e)', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createE2eApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetBeltFixture(dataSource);
  });

  afterAll(async () => {
    if (dataSource) {
      await resetBeltFixture(dataSource);
    }

    if (app) {
      await app.close();
    }
  });

  it('allows order participants to review a completed order once', async () => {
    const order = await createFinishedOrder(app);

    const ownerReviewResponse = await requestCreateReview(
      app,
      order.id,
      OWNER_ID,
      {
        rating: 5,
        comment: 'Great walk.',
      },
    );
    expect(ownerReviewResponse.errors).toBeUndefined();
    expect(ownerReviewResponse.data?.createOrderReview).toMatchObject({
      orderId: order.id,
      reviewerId: String(OWNER_ID),
      revieweeId: String(WALKER_ONE_ID),
      rating: 5,
      comment: 'Great walk.',
    });

    const duplicateReviewResponse = await requestCreateReview(
      app,
      order.id,
      OWNER_ID,
      { rating: 4 },
    );
    expectGraphqlErrorCodes(duplicateReviewResponse, ['REVIEW_ALREADY_EXISTS']);

    const walkerReviewResponse = await requestCreateReview(
      app,
      order.id,
      WALKER_ONE_ID,
      {
        rating: 5,
        comment: 'Clear handoff.',
      },
    );
    expect(walkerReviewResponse.errors).toBeUndefined();
    expect(walkerReviewResponse.data?.createOrderReview).toMatchObject({
      orderId: order.id,
      reviewerId: String(WALKER_ONE_ID),
      revieweeId: String(OWNER_ID),
      rating: 5,
      comment: 'Clear handoff.',
    });
  });

  it('rejects reviews before completion and from unrelated users', async () => {
    const createdOrder = await createOrder(app);
    const earlyReviewResponse = await requestCreateReview(
      app,
      createdOrder.id,
      OWNER_ID,
      { rating: 5 },
    );
    expectGraphqlErrorCodes(earlyReviewResponse, ['REVIEW_ORDER_NOT_COMPLETE']);

    const finishedOrder = await createFinishedOrder(app);
    const unrelatedReviewResponse = await requestCreateReview(
      app,
      finishedOrder.id,
      WALKER_TWO_ID,
      { rating: 5 },
    );
    expectGraphqlErrorCodes(unrelatedReviewResponse, ['REVIEW_FORBIDDEN']);
  });
});
