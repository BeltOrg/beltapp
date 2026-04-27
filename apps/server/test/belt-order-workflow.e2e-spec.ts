import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import { OrderEntity } from '../src/modules/orders/entities/order.entity';
import { OrderStatus } from '../src/modules/orders/enums/order-status.enum';
import {
  DUAL_ROLE_OWNER_ID,
  OWNER_ID,
  WALKER_ONE_ID,
  WALKER_TWO_ID,
  createOrder,
  expectGraphqlErrorCodes,
  getGraphqlErrorCodes,
  requestAcceptOrder,
  requestCancelOrder,
  requestFinishOrder,
  requestMarkOrderPaid,
  requestStartOrder,
  resetBeltFixture,
} from './belt-e2e-fixture';
import { createE2eApp } from './e2e-app';

describe('Belt order workflow (e2e)', () => {
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

  it('allows exactly one walker to accept an order under parallel requests', async () => {
    const order = await createOrder(app);

    const acceptResults = await Promise.all([
      requestAcceptOrder(app, order.id, WALKER_ONE_ID),
      requestAcceptOrder(app, order.id, WALKER_TWO_ID),
    ]);

    const successfulResults = acceptResults.filter((result) => !result.errors);
    const failedCodes = acceptResults.flatMap(getGraphqlErrorCodes);

    expect(successfulResults).toHaveLength(1);
    expect(failedCodes).toEqual(['ORDER_ALREADY_TAKEN']);

    const acceptedOrder = successfulResults[0].data?.acceptOrder;
    expect(acceptedOrder).toMatchObject({
      id: order.id,
      status: OrderStatus.ACCEPTED,
    });
    expect([String(WALKER_ONE_ID), String(WALKER_TWO_ID)]).toContain(
      acceptedOrder?.walkerId,
    );
    expect(acceptedOrder?.acceptedAt).not.toBeNull();

    const orderRepository = dataSource.getRepository(OrderEntity);
    const storedOrder = await orderRepository.findOneByOrFail({
      id: Number(order.id),
    });

    expect(storedOrder.status).toBe(OrderStatus.ACCEPTED);
    expect([WALKER_ONE_ID, WALKER_TWO_ID]).toContain(storedOrder.walkerId);
  });

  it('rejects unauthenticated order mutations', async () => {
    const order = await createOrder(app);
    const response = await requestAcceptOrder(app, order.id, null);

    expectGraphqlErrorCodes(response, ['AUTH_REQUIRED']);
  });

  it('allows owners to cancel created orders', async () => {
    const order = await createOrder(app);
    const response = await requestCancelOrder(app, order.id, OWNER_ID);

    expect(response.errors).toBeUndefined();
    expect(response.data?.cancelOrder).toMatchObject({
      id: order.id,
      status: OrderStatus.CANCELLED,
      walkerId: null,
    });
    expect(response.data?.cancelOrder?.cancelledAt).not.toBeNull();
  });

  it('rejects owners accepting their own orders even with walker role', async () => {
    const order = await createOrder(app, { ownerId: DUAL_ROLE_OWNER_ID });
    const response = await requestAcceptOrder(
      app,
      order.id,
      DUAL_ROLE_OWNER_ID,
    );

    expectGraphqlErrorCodes(response, ['ORDER_OWNER_CANNOT_ACCEPT']);
  });

  it('allows the assigned walker lifecycle and owner payment', async () => {
    const order = await createOrder(app);

    const acceptResponse = await requestAcceptOrder(
      app,
      order.id,
      WALKER_ONE_ID,
    );
    expect(acceptResponse.errors).toBeUndefined();
    expect(acceptResponse.data?.acceptOrder).toMatchObject({
      id: order.id,
      status: OrderStatus.ACCEPTED,
      walkerId: String(WALKER_ONE_ID),
    });

    const startResponse = await requestStartOrder(app, order.id, WALKER_ONE_ID);
    expect(startResponse.errors).toBeUndefined();
    expect(startResponse.data?.startOrder).toMatchObject({
      id: order.id,
      status: OrderStatus.STARTED,
      walkerId: String(WALKER_ONE_ID),
    });

    const finishResponse = await requestFinishOrder(
      app,
      order.id,
      WALKER_ONE_ID,
    );
    expect(finishResponse.errors).toBeUndefined();
    expect(finishResponse.data?.finishOrder).toMatchObject({
      id: order.id,
      status: OrderStatus.FINISHED,
      walkerId: String(WALKER_ONE_ID),
    });

    const paidResponse = await requestMarkOrderPaid(app, order.id, OWNER_ID);
    expect(paidResponse.errors).toBeUndefined();
    expect(paidResponse.data?.markOrderPaid).toMatchObject({
      id: order.id,
      status: OrderStatus.PAID,
    });
    expect(paidResponse.data?.markOrderPaid?.paidAt).not.toBeNull();
  });

  it('rejects unrelated walkers and invalid transitions with stable codes', async () => {
    const order = await createOrder(app);

    const acceptResponse = await requestAcceptOrder(
      app,
      order.id,
      WALKER_ONE_ID,
    );
    expect(acceptResponse.errors).toBeUndefined();

    const unrelatedStartResponse = await requestStartOrder(
      app,
      order.id,
      WALKER_TWO_ID,
    );
    expectGraphqlErrorCodes(unrelatedStartResponse, [
      'ORDER_ASSIGNED_WALKER_REQUIRED',
    ]);

    const startResponse = await requestStartOrder(app, order.id, WALKER_ONE_ID);
    expect(startResponse.errors).toBeUndefined();

    const unrelatedFinishResponse = await requestFinishOrder(
      app,
      order.id,
      WALKER_TWO_ID,
    );
    expectGraphqlErrorCodes(unrelatedFinishResponse, [
      'ORDER_ASSIGNED_WALKER_REQUIRED',
    ]);

    const unpaidOrder = await createOrder(app);
    const earlyPaymentResponse = await requestMarkOrderPaid(
      app,
      unpaidOrder.id,
      OWNER_ID,
    );
    expectGraphqlErrorCodes(earlyPaymentResponse, ['ORDER_INVALID_TRANSITION']);
  });
});
