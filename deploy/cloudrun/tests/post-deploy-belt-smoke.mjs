#!/usr/bin/env node

import { appendFileSync } from "node:fs";

const serviceUrl = process.env.SERVICE_URL;
const healthUrl = process.env.HEALTH_URL;
const graphqlUrl = process.env.GRAPHQL_URL;

if (!serviceUrl || !healthUrl || !graphqlUrl) {
  console.error("SERVICE_URL, HEALTH_URL, and GRAPHQL_URL are required.");
  process.exit(1);
}

const ownerUserId = parseUserId(
  process.env.BELT_SMOKE_OWNER_USER_ID ?? "1",
  "BELT_SMOKE_OWNER_USER_ID",
);
const walkerUserId = parseUserId(
  process.env.BELT_SMOKE_WALKER_USER_ID ?? "2",
  "BELT_SMOKE_WALKER_USER_ID",
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uniqueId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const smokeLabel = `cloud-run-smoke-${uniqueId}`;

const meQuery = `
  query SmokeMe {
    me {
      id
      isVerified
      phone
      roles
    }
  }
`;

const myDogsQuery = `
  query SmokeMyDogs {
    myDogs {
      id
      name
    }
  }
`;

const createDogMutation = `
  mutation SmokeCreateDog($input: CreateDogInput!) {
    createDog(input: $input) {
      id
      name
      ownerId
      size
      behaviorTags
    }
  }
`;

const createOrderMutation = `
  mutation SmokeCreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      dogId
      ownerId
      status
      locationAddress
      startTime
      endTime
      priceAmount
      priceCurrency
    }
  }
`;

const availableOrdersQuery = `
  query SmokeAvailableOrders {
    availableOrders {
      id
      status
    }
  }
`;

const cancelOrderMutation = `
  mutation SmokeCancelOrder($id: ID!, $input: CancelOrderInput) {
    cancelOrder(id: $id, input: $input) {
      id
      status
      cancelledAt
    }
  }
`;

const ownerOrdersQuery = `
  query SmokeOwnerOrders($statuses: [OrderStatus!]) {
    myOwnerOrders(statuses: $statuses) {
      id
      status
    }
  }
`;

function parseUserId(value, envName) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsed;
}

function requireRecord(value, label) {
  if (typeof value !== "object" || value === null) {
    throw new Error(`Expected ${label} to be an object.`);
  }

  return value;
}

function requireRole(user, role, label) {
  if (!Array.isArray(user.roles) || !user.roles.includes(role)) {
    throw new Error(
      `${label} must have ${role} role for the deploy smoke test. Got: ${JSON.stringify(
        user,
      )}`,
    );
  }
}

async function waitForHealthyService() {
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    try {
      const response = await fetch(healthUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        const json = await response.json();
        if (json?.status === "ok") {
          console.log(`[smoke] Health check passed on attempt ${attempt}.`);
          return json;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[smoke] Health check attempt ${attempt} failed: ${message}`);
    }

    await sleep(5_000);
  }

  throw new Error(
    "Timed out waiting for the deployed service health endpoint.",
  );
}

async function postGraphql(query, variables = {}, userId = ownerUserId) {
  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-belt-user-id": String(userId),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });

  const body = await response.text();
  let json;

  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(
      `GraphQL request returned non-JSON HTTP ${response.status}: ${body}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `GraphQL request failed with HTTP ${response.status}: ${JSON.stringify(
        json,
      )}`,
    );
  }

  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

function appendStepSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  appendFileSync(summaryPath, `${lines.join("\n")}\n`);
}

async function main() {
  await waitForHealthyService();

  let createdOrderId;
  let createdOrderCancelled = false;

  try {
    await runBeltSmoke();
    createdOrderCancelled = true;
  } finally {
    if (createdOrderId && !createdOrderCancelled) {
      try {
        await cancelSmokeOrder(createdOrderId);
        console.log(
          `[smoke] Cancelled order ${createdOrderId} during failure cleanup.`,
        );
      } catch (error) {
        console.error(
          `[smoke] Failed to cancel order ${createdOrderId} during cleanup: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  async function runBeltSmoke() {
    const ownerData = await postGraphql(meQuery, {}, ownerUserId);
    const owner = requireRecord(ownerData?.me, "owner me");
    requireRole(owner, "OWNER", `User ${ownerUserId}`);
    console.log(`[smoke] Owner user ${owner.id} is available.`);

    const walkerData = await postGraphql(meQuery, {}, walkerUserId);
    const walker = requireRecord(walkerData?.me, "walker me");
    requireRole(walker, "WALKER", `User ${walkerUserId}`);
    console.log(`[smoke] Walker user ${walker.id} is available.`);

    const dogName = `Cloud Run smoke dog ${smokeLabel}`;
    const dogData = await postGraphql(
      createDogMutation,
      {
        input: {
          name: dogName,
          size: "SMALL",
          behaviorTags: ["FRIENDLY"],
          notes: "Created by deploy smoke validation.",
        },
      },
      ownerUserId,
    );
    const dog = requireRecord(dogData?.createDog, "created dog");

    if (String(dog.ownerId) !== String(ownerUserId) || dog.name !== dogName) {
      throw new Error(`Unexpected dog response: ${JSON.stringify(dogData)}`);
    }

    console.log(`[smoke] Dog creation succeeded with id ${dog.id}.`);

    const dogsData = await postGraphql(myDogsQuery, {}, ownerUserId);
    const dogs = dogsData?.myDogs;
    if (
      !Array.isArray(dogs) ||
      !dogs.some((candidate) => String(candidate.id) === String(dog.id))
    ) {
      throw new Error(
        `Created dog was not returned by myDogs: ${JSON.stringify(dogsData)}`,
      );
    }

    const startTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const orderData = await postGraphql(
      createOrderMutation,
      {
        input: {
          dogId: dog.id,
          startTime,
          endTime,
          locationAddress: `Smoke route ${smokeLabel}`,
          locationLat: 59.437,
          locationLng: 24.7536,
          priceAmount: 1,
          priceCurrency: "EUR",
          estimatedDurationMinutes: 60,
        },
      },
      ownerUserId,
    );
    const order = requireRecord(orderData?.createOrder, "created order");

    if (order.status !== "CREATED" || String(order.dogId) !== String(dog.id)) {
      throw new Error(
        `Unexpected order response: ${JSON.stringify(orderData)}`,
      );
    }

    console.log(`[smoke] Order creation succeeded with id ${order.id}.`);
    createdOrderId = order.id;

    const availableData = await postGraphql(
      availableOrdersQuery,
      {},
      walkerUserId,
    );
    const availableOrders = availableData?.availableOrders;
    if (
      !Array.isArray(availableOrders) ||
      !availableOrders.some(
        (candidate) => String(candidate.id) === String(order.id),
      )
    ) {
      throw new Error(
        `Created order was not visible in availableOrders: ${JSON.stringify(
          availableData,
        )}`,
      );
    }

    console.log("[smoke] Available-order visibility succeeded.");

    const cancelData = await cancelSmokeOrder(order.id);
    const cancelledOrder = requireRecord(
      cancelData?.cancelOrder,
      "cancelled order",
    );

    if (cancelledOrder.status !== "CANCELLED") {
      throw new Error(
        `Unexpected cancel response: ${JSON.stringify(cancelData)}`,
      );
    }

    console.log("[smoke] Order cancellation succeeded.");
    createdOrderCancelled = true;

    const ownerOrdersData = await postGraphql(
      ownerOrdersQuery,
      { statuses: ["CANCELLED"] },
      ownerUserId,
    );
    const ownerOrders = ownerOrdersData?.myOwnerOrders;
    if (
      !Array.isArray(ownerOrders) ||
      !ownerOrders.some(
        (candidate) => String(candidate.id) === String(order.id),
      )
    ) {
      throw new Error(
        `Cancelled order was not returned by myOwnerOrders: ${JSON.stringify(
          ownerOrdersData,
        )}`,
      );
    }

    appendStepSummary([
      "### Cloud Run Belt Smoke Test",
      "",
      `- Service URL: \`${serviceUrl}\``,
      "- Health check: passed",
      `- Owner user: \`${owner.id}\``,
      `- Walker user: \`${walker.id}\``,
      `- Dog creation/query: passed with id \`${dog.id}\``,
      `- Order creation/availability/cancellation: passed with id \`${order.id}\``,
    ]);

    console.log("[smoke] Deployed backend Belt smoke test passed.");
  }
}

async function cancelSmokeOrder(orderId) {
  return postGraphql(
    cancelOrderMutation,
    {
      id: orderId,
      input: {
        reason: `Smoke validation cleanup ${smokeLabel}`,
      },
    },
    ownerUserId,
  );
}

main().catch((error) => {
  console.error(
    `[smoke] ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  );
  process.exit(1);
});
