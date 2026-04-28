import { useMemo } from "react";
import { graphql, useSubscription } from "react-relay";
import type { GraphQLSubscriptionConfig } from "relay-runtime";
import type { useBeltEventsSubscriptionSubscription } from "./__generated__/useBeltEventsSubscriptionSubscription.graphql";

type BeltEventsUpdater =
  GraphQLSubscriptionConfig<useBeltEventsSubscriptionSubscription>["updater"];
type BeltEventsOnNext =
  GraphQLSubscriptionConfig<useBeltEventsSubscriptionSubscription>["onNext"];

export type BeltEventsSubscriptionResponse =
  useBeltEventsSubscriptionSubscription["response"];

type BeltEventsSubscriptionOptions = {
  onNext?: BeltEventsOnNext;
  updater?: BeltEventsUpdater;
};

export function useBeltEventsSubscription({
  onNext,
  updater,
}: BeltEventsSubscriptionOptions = {}): void {
  const subscriptionConfig =
    useMemo<GraphQLSubscriptionConfig<useBeltEventsSubscriptionSubscription>>(
      () => ({
        subscription: graphql`
          subscription useBeltEventsSubscriptionSubscription {
            beltEvent {
              id
              type
              subjectId
              dog {
                id
                ownerId
                name
                size
                behaviorTags
                notes
                createdAt
                updatedAt
              }
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
        onNext,
        updater,
      }),
      [onNext, updater],
    );

  useSubscription<useBeltEventsSubscriptionSubscription>(subscriptionConfig);
}
