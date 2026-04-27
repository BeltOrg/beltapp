import { Order } from './dto/order.model';
import { OrderEntity } from './entities/order.entity';

export function mapOrder(entity: OrderEntity): Order {
  return {
    id: String(entity.id),
    ownerId: String(entity.ownerId),
    walkerId: entity.walkerId === null ? null : String(entity.walkerId),
    dogId: String(entity.dogId),
    status: entity.status,
    priceAmount: entity.priceAmount,
    priceCurrency: entity.priceCurrency,
    locationLat: entity.locationLat,
    locationLng: entity.locationLng,
    locationAddress: entity.locationAddress,
    startTime: entity.startTime,
    endTime: entity.endTime,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    acceptedAt: entity.acceptedAt,
    startedAt: entity.startedAt,
    finishedAt: entity.finishedAt,
    cancelledAt: entity.cancelledAt,
    paidAt: entity.paidAt,
  };
}
