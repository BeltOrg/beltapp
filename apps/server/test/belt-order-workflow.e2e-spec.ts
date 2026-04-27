import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import { OrderEntity } from '../src/modules/orders/entities/order.entity';
import { OrderStatus } from '../src/modules/orders/enums/order-status.enum';
import { createE2eApp, graphqlRequest, GraphqlResponse } from './e2e-app';

const OWNER_ID = 101;
const WALKER_ONE_ID = 102;
const WALKER_TWO_ID = 103;
const TEST_USER_IDS = [OWNER_ID, WALKER_ONE_ID, WALKER_TWO_ID];

const CREATE_DOG_MUTATION = `
  mutation CreateDog($input: CreateDogInput!) {
    createDog(input: $input) {
      id
      ownerId
      name
    }
  }
`;

const CREATE_ORDER_MUTATION = `
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      ownerId
      dogId
      status
      walkerId
    }
  }
`;

const ACCEPT_ORDER_MUTATION = `
  mutation AcceptOrder($id: ID!) {
    acceptOrder(id: $id) {
      id
      status
      walkerId
      acceptedAt
    }
  }
`;

type CreateDogData = {
  createDog: {
    id: string;
    ownerId: string;
    name: string;
  };
};

type CreateOrderData = {
  createOrder: {
    id: string;
    ownerId: string;
    dogId: string;
    status: OrderStatus;
    walkerId: string | null;
  };
};

type AcceptOrderData = {
  acceptOrder: {
    id: string;
    status: OrderStatus;
    walkerId: string | null;
    acceptedAt: number | null;
  };
};

function getGraphqlErrorCodes<TData>(
  response: GraphqlResponse<TData>,
): string[] {
  return (
    response.errors?.map((error) => {
      const originalError = error.extensions?.originalError;
      if (
        typeof originalError === 'object' &&
        originalError !== null &&
        'code' in originalError &&
        typeof originalError.code === 'string'
      ) {
        return originalError.code;
      }

      const extensionCode = error.extensions?.code;
      return typeof extensionCode === 'string' ? extensionCode : 'UNKNOWN';
    }) ?? []
  );
}

async function resetBeltFixture(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `
      DELETE FROM order_review
      WHERE reviewer_id = ANY($1::int[])
        OR reviewee_id = ANY($1::int[])
    `,
    [TEST_USER_IDS],
  );
  await dataSource.query(
    `
      DELETE FROM walk_order
      WHERE owner_id = ANY($1::int[])
        OR walker_id = ANY($1::int[])
    `,
    [TEST_USER_IDS],
  );
  await dataSource.query(
    `
      DELETE FROM dog
      WHERE owner_id = ANY($1::int[])
    `,
    [TEST_USER_IDS],
  );
  await dataSource.query(
    `
      DELETE FROM belt_user
      WHERE id = ANY($1::int[])
    `,
    [TEST_USER_IDS],
  );
  await dataSource.query(`
    INSERT INTO belt_user (id, phone, roles, is_verified)
    VALUES
      (${OWNER_ID}, '+3725550101', ARRAY['OWNER']::belt_user_role[], true),
      (${WALKER_ONE_ID}, '+3725550102', ARRAY['WALKER']::belt_user_role[], true),
      (${WALKER_TWO_ID}, '+3725550103', ARRAY['WALKER']::belt_user_role[], true)
  `);
}

async function createOrderThroughGraphql(
  app: NestFastifyApplication,
): Promise<string> {
  const dogResponse = await graphqlRequest<CreateDogData>(app, {
    userId: OWNER_ID,
    query: CREATE_DOG_MUTATION,
    variables: {
      input: {
        name: 'Parallel Test Dog',
        size: 'MEDIUM',
        behaviorTags: ['FRIENDLY'],
        notes: 'Created by the order workflow e2e spec.',
      },
    },
  });

  expect(dogResponse.errors).toBeUndefined();

  const orderResponse = await graphqlRequest<CreateOrderData>(app, {
    userId: OWNER_ID,
    query: CREATE_ORDER_MUTATION,
    variables: {
      input: {
        dogId: dogResponse.data?.createDog.id,
        priceAmount: 1200,
        priceCurrency: 'EUR',
        locationLat: 59.437,
        locationLng: 24.7536,
        locationAddress: 'Tallinn, Kesklinn',
        startTime: Date.parse('2026-05-01T10:00:00.000Z'),
        endTime: Date.parse('2026-05-01T11:00:00.000Z'),
      },
    },
  });

  expect(orderResponse.errors).toBeUndefined();
  expect(orderResponse.data?.createOrder).toMatchObject({
    ownerId: String(OWNER_ID),
    status: OrderStatus.CREATED,
    walkerId: null,
  });

  return orderResponse.data!.createOrder.id;
}

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
    const orderId = await createOrderThroughGraphql(app);

    const acceptResults = await Promise.all([
      graphqlRequest<AcceptOrderData>(app, {
        userId: WALKER_ONE_ID,
        query: ACCEPT_ORDER_MUTATION,
        variables: { id: orderId },
      }),
      graphqlRequest<AcceptOrderData>(app, {
        userId: WALKER_TWO_ID,
        query: ACCEPT_ORDER_MUTATION,
        variables: { id: orderId },
      }),
    ]);

    const successfulResults = acceptResults.filter((result) => !result.errors);
    const failedCodes = acceptResults.flatMap(getGraphqlErrorCodes);

    expect(successfulResults).toHaveLength(1);
    expect(failedCodes).toEqual(['ORDER_ALREADY_TAKEN']);

    const acceptedOrder = successfulResults[0].data?.acceptOrder;
    expect(acceptedOrder).toMatchObject({
      id: orderId,
      status: OrderStatus.ACCEPTED,
    });
    expect([String(WALKER_ONE_ID), String(WALKER_TWO_ID)]).toContain(
      acceptedOrder?.walkerId,
    );
    expect(acceptedOrder?.acceptedAt).not.toBeNull();

    const orderRepository = dataSource.getRepository(OrderEntity);
    const storedOrder = await orderRepository.findOneByOrFail({
      id: Number(orderId),
    });

    expect(storedOrder.status).toBe(OrderStatus.ACCEPTED);
    expect([WALKER_ONE_ID, WALKER_TWO_ID]).toContain(storedOrder.walkerId);
  });
});
