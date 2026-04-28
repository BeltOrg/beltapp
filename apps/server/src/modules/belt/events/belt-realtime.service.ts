import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { logStructuredEvent } from '../../../logging/structured-log';
import { DogEntity } from '../../dogs/entities/dog.entity';
import { mapDog } from '../../dogs/dogs.mapper';
import { OrderEntity } from '../../orders/entities/order.entity';
import { mapOrder } from '../../orders/orders.mapper';
import { RealtimePubSubService } from '../../realtime/realtime-pubsub.service';
import { ReviewEntity } from '../../reviews/entities/review.entity';
import { mapReview } from '../../reviews/reviews.mapper';
import { UserEntity } from '../../users/entities/user.entity';
import { mapUser } from '../../users/users.mapper';
import { BeltEvent, BeltEventPayload } from './belt-event.model';
import { BeltEventType } from './belt-event-type.enum';

const BELT_EVENT_TOPIC = 'belt.event';

@Injectable()
export class BeltRealtimeService {
  private readonly logger = new Logger(BeltRealtimeService.name);

  constructor(private readonly pubSubService: RealtimePubSubService) {}

  beltEventIterator(): AsyncIterableIterator<BeltEventPayload> {
    return this.pubSubService.asyncIterator<BeltEventPayload>(BELT_EVENT_TOPIC);
  }

  async publishOrderEvent(
    type: BeltEventType,
    order: OrderEntity,
  ): Promise<void> {
    await this.safePublish({
      id: randomUUID(),
      type,
      occurredAt: new Date(),
      subjectId: String(order.id),
      user: null,
      dog: null,
      order: mapOrder(order),
      review: null,
    });
  }

  async publishDogEvent(type: BeltEventType, dog: DogEntity): Promise<void> {
    await this.safePublish({
      id: randomUUID(),
      type,
      occurredAt: new Date(),
      subjectId: String(dog.id),
      user: null,
      dog: mapDog(dog),
      order: null,
      review: null,
    });
  }

  async publishUserEvent(type: BeltEventType, user: UserEntity): Promise<void> {
    await this.safePublish({
      id: randomUUID(),
      type,
      occurredAt: new Date(),
      subjectId: String(user.id),
      user: mapUser(user),
      dog: null,
      order: null,
      review: null,
    });
  }

  async publishReviewEvent(
    type: BeltEventType,
    review: ReviewEntity,
  ): Promise<void> {
    await this.safePublish({
      id: randomUUID(),
      type,
      occurredAt: new Date(),
      subjectId: String(review.id),
      user: null,
      dog: null,
      order: null,
      review: mapReview(review),
    });
  }

  private async safePublish(event: BeltEvent): Promise<void> {
    try {
      await this.pubSubService.publish<BeltEventPayload>(BELT_EVENT_TOPIC, {
        beltEvent: event,
      });
    } catch (error) {
      logStructuredEvent(
        this.logger,
        'warn',
        'belt_event_publish_failed',
        {
          subjectId: event.subjectId,
          type: event.type,
        },
        error,
      );
    }
  }
}
