import { AuthenticatedRequestUser } from '../../auth/auth-context';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { UserRole } from '../../users/enums/user-role.enum';
import { BeltEvent } from './belt-event.model';
import { BeltEventType } from './belt-event-type.enum';

const AVAILABLE_ORDER_EXIT_EVENTS = new Set<BeltEventType>([
  BeltEventType.ORDER_ACCEPTED,
  BeltEventType.ORDER_STARTED,
  BeltEventType.ORDER_FINISHED,
  BeltEventType.ORDER_CANCELLED,
  BeltEventType.ORDER_PAID,
]);

export function canReceiveBeltEvent(
  event: BeltEvent,
  user: AuthenticatedRequestUser,
): boolean {
  if (event.dog) {
    return event.dog.ownerId === String(user.id);
  }

  if (event.order) {
    return canReceiveOrderEvent(event, user);
  }

  if (event.user) {
    return event.user.id === String(user.id);
  }

  return false;
}

export function resolveBeltEventForUser(
  event: BeltEvent,
  user: AuthenticatedRequestUser,
): BeltEvent {
  if (!event.order || isFullOrderVisibleToUser(event, user)) {
    return event;
  }

  return {
    ...event,
    order: null,
  };
}

function canReceiveOrderEvent(
  event: BeltEvent,
  user: AuthenticatedRequestUser,
): boolean {
  if (!event.order) {
    return false;
  }

  if (isOrderParticipant(event, user)) {
    return true;
  }

  if (!user.roles.includes(UserRole.WALKER)) {
    return false;
  }

  if (event.order.ownerId === String(user.id)) {
    return false;
  }

  if (isFullOrderVisibleToUser(event, user)) {
    return true;
  }

  return AVAILABLE_ORDER_EXIT_EVENTS.has(event.type);
}

function isFullOrderVisibleToUser(
  event: BeltEvent,
  user: AuthenticatedRequestUser,
): boolean {
  if (!event.order) {
    return false;
  }

  return (
    isOrderParticipant(event, user) ||
    (user.roles.includes(UserRole.WALKER) &&
      event.order.ownerId !== String(user.id) &&
      event.order.status === OrderStatus.CREATED &&
      event.order.walkerId === null)
  );
}

function isOrderParticipant(
  event: BeltEvent,
  user: AuthenticatedRequestUser,
): boolean {
  if (!event.order) {
    return false;
  }

  return (
    event.order.ownerId === String(user.id) ||
    event.order.walkerId === String(user.id)
  );
}
