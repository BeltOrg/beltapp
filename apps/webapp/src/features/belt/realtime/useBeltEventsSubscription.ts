import { useMemo } from "react";
import { graphql, useSubscription } from "react-relay";
import type { GraphQLSubscriptionConfig } from "relay-runtime";
import type { useBeltEventsSubscriptionSubscription } from "./__generated__/useBeltEventsSubscriptionSubscription.graphql";

type BeltEventsUpdater =
  GraphQLSubscriptionConfig<useBeltEventsSubscriptionSubscription>["updater"];

export function useBeltEventsSubscription(updater?: BeltEventsUpdater): void {
  const subscriptionConfig =
    useMemo<GraphQLSubscriptionConfig<useBeltEventsSubscriptionSubscription>>(
      () => ({
        subscription: graphql`
          subscription useBeltEventsSubscriptionSubscription {
            beltEvent {
              id
              type
              subjectId
              order {
                id
                ownerId
                walkerId
                dogId
                status
                priceAmount
                priceCurrency
                locationAddress
                locationLat
                locationLng
                startTime
                endTime
                acceptedAt
                startedAt
                finishedAt
                cancelledAt
                paidAt
              }
            }
          }
        `,
        variables: {},
        updater,
      }),
      [updater],
    );

  useSubscription<useBeltEventsSubscriptionSubscription>(subscriptionConfig);
}
