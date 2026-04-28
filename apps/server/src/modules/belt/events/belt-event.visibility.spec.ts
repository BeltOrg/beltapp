import { UserRole } from '../../users/enums/user-role.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { BeltEvent } from './belt-event.model';
import { BeltEventType } from './belt-event-type.enum';
import {
  canReceiveBeltEvent,
  resolveBeltEventForUser,
} from './belt-event.visibility';

function buildOrderEvent(overrides: Partial<BeltEvent> = {}): BeltEvent {
  return {
    id: 'event-1',
    type: BeltEventType.ORDER_CREATED,
    occurredAt: new Date('2026-04-28T00:00:00.000Z'),
    subjectId: '10',
    user: null,
    dog: null,
    review: null,
    order: {
      id: '10',
      ownerId: '1',
      walkerId: null,
      dogId: '5',
      status: OrderStatus.CREATED,
      priceAmount: 1200,
      priceCurrency: 'EUR',
      locationLat: 59.437,
      locationLng: 24.7536,
      locationAddress: 'Tallinn',
      startTime: new Date('2026-05-01T10:00:00.000Z'),
      endTime: new Date('2026-05-01T11:00:00.000Z'),
      createdAt: new Date('2026-04-27T10:00:00.000Z'),
      updatedAt: new Date('2026-04-27T10:00:00.000Z'),
      acceptedAt: null,
      startedAt: null,
      finishedAt: null,
      cancelledAt: null,
      paidAt: null,
    },
    ...overrides,
  };
}

describe('Belt event visibility', () => {
  it('lets walkers see newly available order details', () => {
    const event = buildOrderEvent();
    const walker = { id: 2, phone: '+1', roles: [UserRole.WALKER] };

    expect(canReceiveBeltEvent(event, walker)).toBe(true);
    expect(resolveBeltEventForUser(event, walker).order).toMatchObject({
      id: '10',
      status: OrderStatus.CREATED,
    });
  });

  it('lets other walkers receive removal events without full order details', () => {
    const event = buildOrderEvent({
      type: BeltEventType.ORDER_ACCEPTED,
      order: {
        ...buildOrderEvent().order!,
        status: OrderStatus.ACCEPTED,
        walkerId: '3',
      },
    });
    const otherWalker = { id: 2, phone: '+1', roles: [UserRole.WALKER] };

    expect(canReceiveBeltEvent(event, otherWalker)).toBe(true);
    expect(resolveBeltEventForUser(event, otherWalker)).toMatchObject({
      subjectId: '10',
      order: null,
    });
  });

  it('keeps accepted order details visible to participants', () => {
    const event = buildOrderEvent({
      type: BeltEventType.ORDER_ACCEPTED,
      order: {
        ...buildOrderEvent().order!,
        status: OrderStatus.ACCEPTED,
        walkerId: '2',
      },
    });
    const assignedWalker = { id: 2, phone: '+1', roles: [UserRole.WALKER] };

    expect(canReceiveBeltEvent(event, assignedWalker)).toBe(true);
    expect(resolveBeltEventForUser(event, assignedWalker).order).toMatchObject({
      id: '10',
      walkerId: '2',
    });
  });

  it('does not send owner-only user events to other users', () => {
    const event = buildOrderEvent({
      order: null,
      type: BeltEventType.USER_UPDATED,
      subjectId: '1',
      user: {
        id: '1',
        phone: '+1',
        roles: [UserRole.OWNER],
        rating: 5,
        isVerified: true,
        createdAt: new Date('2026-04-27T10:00:00.000Z'),
        updatedAt: new Date('2026-04-27T10:00:00.000Z'),
      },
    });
    const otherUser = { id: 2, phone: '+2', roles: [UserRole.OWNER] };

    expect(canReceiveBeltEvent(event, otherUser)).toBe(false);
  });
});
