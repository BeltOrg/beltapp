import { Resolver, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  BeltGraphqlContext,
  getCurrentUserFromContext,
} from '../../auth/auth-context';
import { GraphqlAuthGuard } from '../../auth/graphql-auth.guard';
import { BeltEvent, BeltEventPayload } from './belt-event.model';
import {
  canReceiveBeltEvent,
  resolveBeltEventForUser,
} from './belt-event.visibility';
import { BeltRealtimeService } from './belt-realtime.service';

@Resolver(() => BeltEvent)
@UseGuards(GraphqlAuthGuard)
export class BeltRealtimeResolver {
  constructor(private readonly beltRealtimeService: BeltRealtimeService) {}

  @Subscription(() => BeltEvent, {
    filter: (
      payload: BeltEventPayload,
      _variables: unknown,
      context: BeltGraphqlContext,
    ) => {
      const currentUser = getCurrentUserFromContext(context);
      return currentUser
        ? canReceiveBeltEvent(payload.beltEvent, currentUser)
        : false;
    },
    resolve: (
      payload: BeltEventPayload,
      _variables: unknown,
      context: BeltGraphqlContext,
    ) => {
      const currentUser = getCurrentUserFromContext(context);
      return currentUser
        ? resolveBeltEventForUser(payload.beltEvent, currentUser)
        : payload.beltEvent;
    },
  })
  beltEvent(): AsyncIterableIterator<BeltEventPayload> {
    return this.beltRealtimeService.beltEventIterator();
  }
}
