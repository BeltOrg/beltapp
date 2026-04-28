import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import { OrderStatus } from '../src/modules/orders/enums/order-status.enum';
import { GraphqlResponse, graphqlRequest } from './e2e-app';

export const OWNER_ID = 101;
export const WALKER_ONE_ID = 102;
export const WALKER_TWO_ID = 103;
export const DUAL_ROLE_OWNER_ID = 104;
export const OTHER_OWNER_ID = 105;

const TEST_USER_IDS = [
  OWNER_ID,
  WALKER_ONE_ID,
  WALKER_TWO_ID,
  DUAL_ROLE_OWNER_ID,
  OTHER_OWNER_ID,
];

const ORDER_FIELDS = `
  id
  ownerId
  dogId
  status
  walkerId
  acceptedAt
  startedAt
  finishedAt
  cancelledAt
  paidAt
`;

const DOG_FIELDS = `
  id
  ownerId
  name
  size
  behaviorTags
  notes
`;

const REVIEW_FIELDS = `
  id
  orderId
  reviewerId
  revieweeId
  rating
  comment
`;

export const CREATE_DOG_MUTATION = `
  mutation CreateDog($input: CreateDogInput!) {
    createDog(input: $input) {
      ${DOG_FIELDS}
    }
  }
`;

export const UPDATE_DOG_MUTATION = `
  mutation UpdateDog($id: ID!, $input: UpdateDogInput!) {
    updateDog(id: $id, input: $input) {
      ${DOG_FIELDS}
    }
  }
`;

export const DELETE_DOG_MUTATION = `
  mutation DeleteDog($id: ID!) {
    deleteDog(id: $id)
  }
`;

export const DOG_QUERY = `
  query Dog($id: ID!) {
    dog(id: $id) {
      ${DOG_FIELDS}
    }
  }
`;

export const MY_DOGS_QUERY = `
  query MyDogs {
    myDogs {
      ${DOG_FIELDS}
    }
  }
`;

export const CREATE_ORDER_MUTATION = `
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      ${ORDER_FIELDS}
    }
  }
`;

export const ACCEPT_ORDER_MUTATION = `
  mutation AcceptOrder($id: ID!) {
    acceptOrder(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const START_ORDER_MUTATION = `
  mutation StartOrder($id: ID!) {
    startOrder(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const FINISH_ORDER_MUTATION = `
  mutation FinishOrder($id: ID!) {
    finishOrder(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const CANCEL_ORDER_MUTATION = `
  mutation CancelOrder($id: ID!, $input: CancelOrderInput) {
    cancelOrder(id: $id, input: $input) {
      ${ORDER_FIELDS}
    }
  }
`;

export const MARK_ORDER_PAID_MUTATION = `
  mutation MarkOrderPaid($id: ID!) {
    markOrderPaid(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const CREATE_REVIEW_MUTATION = `
  mutation CreateOrderReview($orderId: ID!, $input: CreateReviewInput!) {
    createOrderReview(orderId: $orderId, input: $input) {
      ${REVIEW_FIELDS}
    }
  }
`;

export type DogPayload = {
  id: string;
  ownerId: string;
  name: string;
  size: string;
  behaviorTags: string[];
  notes: string | null;
};

export type OrderPayload = {
  id: string;
  ownerId: string;
  dogId: string;
  status: OrderStatus;
  walkerId: string | null;
  acceptedAt: number | null;
  startedAt: number | null;
  finishedAt: number | null;
  cancelledAt: number | null;
  paidAt: number | null;
};

export type ReviewPayload = {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
};

export type CreateDogData = {
  createDog: DogPayload;
};

export type UpdateDogData = {
  updateDog: DogPayload;
};

export type DeleteDogData = {
  deleteDog: boolean;
};

export type DogData = {
  dog: DogPayload;
};

export type MyDogsData = {
  myDogs: DogPayload[];
};

export type CreateOrderData = {
  createOrder: OrderPayload;
};

export type OrderActionData = {
  acceptOrder?: OrderPayload;
  startOrder?: OrderPayload;
  finishOrder?: OrderPayload;
  cancelOrder?: OrderPayload;
  markOrderPaid?: OrderPayload;
};

export type CreateReviewData = {
  createOrderReview: ReviewPayload;
};

type CreateDogOverrides = Partial<{
  name: string;
  size: string;
  behaviorTags: string[];
  notes: string | null;
}>;

type CreateOrderOptions = {
  ownerId?: number;
  dogId?: string;
};

type CreateReviewInput = {
  rating: number;
  comment?: string | null;
};

export function getGraphqlErrorCodes<TData>(
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

export function expectGraphqlErrorCodes<TData>(
  response: GraphqlResponse<TData>,
  expectedCodes: string[],
): void {
  expect(getGraphqlErrorCodes(response)).toEqual(expectedCodes);
}

export async function resetBeltFixture(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `
      DELETE FROM auth_refresh_token
      WHERE user_id = ANY($1::int[])
    `,
    [TEST_USER_IDS],
  );
  await dataSource.query(
    `
      DELETE FROM auth_account
      WHERE user_id = ANY($1::int[])
    `,
    [TEST_USER_IDS],
  );
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
      (${WALKER_TWO_ID}, '+3725550103', ARRAY['WALKER']::belt_user_role[], true),
      (${DUAL_ROLE_OWNER_ID}, '+3725550104', ARRAY['OWNER', 'WALKER']::belt_user_role[], true),
      (${OTHER_OWNER_ID}, '+3725550105', ARRAY['OWNER']::belt_user_role[], true)
  `);
}

export async function requestCreateDog(
  app: NestFastifyApplication,
  userId: number | null,
  overrides: CreateDogOverrides = {},
): Promise<GraphqlResponse<CreateDogData>> {
  return graphqlRequest<CreateDogData>(app, {
    userId,
    query: CREATE_DOG_MUTATION,
    variables: {
      input: {
        name: overrides.name ?? 'Belt Test Dog',
        size: overrides.size ?? 'MEDIUM',
        behaviorTags: overrides.behaviorTags ?? ['FRIENDLY'],
        notes: overrides.notes ?? 'Created by Belt e2e tests.',
      },
    },
  });
}

export async function createDog(
  app: NestFastifyApplication,
  ownerId = OWNER_ID,
  overrides: CreateDogOverrides = {},
): Promise<DogPayload> {
  const response = await requestCreateDog(app, ownerId, overrides);

  expect(response.errors).toBeUndefined();
  return response.data!.createDog;
}

export async function requestDog(
  app: NestFastifyApplication,
  userId: number | null,
  dogId: string,
): Promise<GraphqlResponse<DogData>> {
  return graphqlRequest<DogData>(app, {
    userId,
    query: DOG_QUERY,
    variables: { id: dogId },
  });
}

export async function requestUpdateDog(
  app: NestFastifyApplication,
  userId: number | null,
  dogId: string,
  input: Record<string, unknown>,
): Promise<GraphqlResponse<UpdateDogData>> {
  return graphqlRequest<UpdateDogData>(app, {
    userId,
    query: UPDATE_DOG_MUTATION,
    variables: { id: dogId, input },
  });
}

export async function requestDeleteDog(
  app: NestFastifyApplication,
  userId: number | null,
  dogId: string,
): Promise<GraphqlResponse<DeleteDogData>> {
  return graphqlRequest<DeleteDogData>(app, {
    userId,
    query: DELETE_DOG_MUTATION,
    variables: { id: dogId },
  });
}

export async function requestMyDogs(
  app: NestFastifyApplication,
  userId: number | null,
): Promise<GraphqlResponse<MyDogsData>> {
  return graphqlRequest<MyDogsData>(app, {
    userId,
    query: MY_DOGS_QUERY,
  });
}

export async function requestCreateOrder(
  app: NestFastifyApplication,
  options: CreateOrderOptions = {},
): Promise<GraphqlResponse<CreateOrderData>> {
  const ownerId = options.ownerId ?? OWNER_ID;
  const dogId = options.dogId ?? (await createDog(app, ownerId)).id;

  return graphqlRequest<CreateOrderData>(app, {
    userId: ownerId,
    query: CREATE_ORDER_MUTATION,
    variables: {
      input: {
        dogId,
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
}

export async function createOrder(
  app: NestFastifyApplication,
  options: CreateOrderOptions = {},
): Promise<OrderPayload> {
  const response = await requestCreateOrder(app, options);

  expect(response.errors).toBeUndefined();
  expect(response.data?.createOrder).toMatchObject({
    ownerId: String(options.ownerId ?? OWNER_ID),
    status: OrderStatus.CREATED,
    walkerId: null,
  });

  return response.data!.createOrder;
}

export function requestAcceptOrder(
  app: NestFastifyApplication,
  orderId: string,
  userId: number | null,
): Promise<GraphqlResponse<OrderActionData>> {
  return graphqlRequest<OrderActionData>(app, {
    userId,
    query: ACCEPT_ORDER_MUTATION,
    variables: { id: orderId },
  });
}

export function requestStartOrder(
  app: NestFastifyApplication,
  orderId: string,
  userId: number | null,
): Promise<GraphqlResponse<OrderActionData>> {
  return graphqlRequest<OrderActionData>(app, {
    userId,
    query: START_ORDER_MUTATION,
    variables: { id: orderId },
  });
}

export function requestFinishOrder(
  app: NestFastifyApplication,
  orderId: string,
  userId: number | null,
): Promise<GraphqlResponse<OrderActionData>> {
  return graphqlRequest<OrderActionData>(app, {
    userId,
    query: FINISH_ORDER_MUTATION,
    variables: { id: orderId },
  });
}

export function requestCancelOrder(
  app: NestFastifyApplication,
  orderId: string,
  userId: number | null,
): Promise<GraphqlResponse<OrderActionData>> {
  return graphqlRequest<OrderActionData>(app, {
    userId,
    query: CANCEL_ORDER_MUTATION,
    variables: { id: orderId },
  });
}

export function requestMarkOrderPaid(
  app: NestFastifyApplication,
  orderId: string,
  userId: number | null,
): Promise<GraphqlResponse<OrderActionData>> {
  return graphqlRequest<OrderActionData>(app, {
    userId,
    query: MARK_ORDER_PAID_MUTATION,
    variables: { id: orderId },
  });
}

export async function createFinishedOrder(
  app: NestFastifyApplication,
): Promise<OrderPayload> {
  const order = await createOrder(app);

  const acceptResponse = await requestAcceptOrder(app, order.id, WALKER_ONE_ID);
  expect(acceptResponse.errors).toBeUndefined();

  const startResponse = await requestStartOrder(app, order.id, WALKER_ONE_ID);
  expect(startResponse.errors).toBeUndefined();

  const finishResponse = await requestFinishOrder(app, order.id, WALKER_ONE_ID);
  expect(finishResponse.errors).toBeUndefined();

  return finishResponse.data!.finishOrder!;
}

export function requestCreateReview(
  app: NestFastifyApplication,
  orderId: string,
  userId: number | null,
  input: CreateReviewInput,
): Promise<GraphqlResponse<CreateReviewData>> {
  return graphqlRequest<CreateReviewData>(app, {
    userId,
    query: CREATE_REVIEW_MUTATION,
    variables: { orderId, input },
  });
}
