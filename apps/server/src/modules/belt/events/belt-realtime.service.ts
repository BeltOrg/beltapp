import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { logStructuredEvent } from '../../../logging/structured-log';
import { OrderEntity } from '../../orders/entities/order.entity';
import { mapOrder } from '../../orders/orders.mapper';
import { RealtimePubSubService } from '../../realtime/realtime-pubsub.service';
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
