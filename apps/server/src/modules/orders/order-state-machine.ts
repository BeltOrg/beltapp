import { OrderStatus } from './enums/order-status.enum';

const ALLOWED_TRANSITIONS = new Map<OrderStatus, ReadonlySet<OrderStatus>>([
  [OrderStatus.CREATED, new Set([OrderStatus.ACCEPTED, OrderStatus.CANCELLED])],
  [OrderStatus.ACCEPTED, new Set([OrderStatus.STARTED, OrderStatus.CANCELLED])],
  [OrderStatus.STARTED, new Set([OrderStatus.FINISHED])],
  [OrderStatus.FINISHED, new Set([OrderStatus.PAID])],
  [OrderStatus.PAID, new Set()],
  [OrderStatus.CANCELLED, new Set()],
]);

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ALLOWED_TRANSITIONS.get(from)?.has(to) ?? false;
}

export function getAllowedOrderTransitions(from: OrderStatus): OrderStatus[] {
  return Array.from(ALLOWED_TRANSITIONS.get(from) ?? []);
}
