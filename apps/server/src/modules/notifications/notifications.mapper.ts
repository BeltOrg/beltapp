import { BeltNotification } from './dto/notification.model';
import { NotificationEntity } from './entities/notification.entity';

function mapOptionalId(value: number | null): string | null {
  return value === null ? null : String(value);
}

export function mapNotification(entity: NotificationEntity): BeltNotification {
  return {
    id: String(entity.id),
    recipientId: String(entity.recipientId),
    type: entity.type,
    title: entity.title,
    body: entity.body,
    actionUrl: entity.actionUrl,
    orderId: mapOptionalId(entity.orderId),
    actorId: mapOptionalId(entity.actorId),
    readAt: entity.readAt,
    createdAt: entity.createdAt,
  };
}
