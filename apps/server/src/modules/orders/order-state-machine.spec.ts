import {
  canTransitionOrderStatus,
  getAllowedOrderTransitions,
} from './order-state-machine';
import { OrderStatus } from './enums/order-status.enum';

describe('order state machine', () => {
  const allowedTransitions: Array<[OrderStatus, OrderStatus]> = [
    [OrderStatus.CREATED, OrderStatus.ACCEPTED],
    [OrderStatus.CREATED, OrderStatus.CANCELLED],
    [OrderStatus.ACCEPTED, OrderStatus.STARTED],
    [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
    [OrderStatus.STARTED, OrderStatus.FINISHED],
    [OrderStatus.FINISHED, OrderStatus.PAID],
  ];
  const rejectedTransitions: Array<[OrderStatus, OrderStatus]> = [
    [OrderStatus.CREATED, OrderStatus.STARTED],
    [OrderStatus.ACCEPTED, OrderStatus.FINISHED],
    [OrderStatus.STARTED, OrderStatus.CANCELLED],
    [OrderStatus.FINISHED, OrderStatus.ACCEPTED],
    [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.CANCELLED, OrderStatus.ACCEPTED],
  ];

  for (const [from, to] of allowedTransitions) {
    it(`allows ${from} -> ${to}`, () => {
      expect(canTransitionOrderStatus(from, to)).toBe(true);
    });
  }

  for (const [from, to] of rejectedTransitions) {
    it(`rejects ${from} -> ${to}`, () => {
      expect(canTransitionOrderStatus(from, to)).toBe(false);
    });
  }

  it('keeps terminal states terminal', () => {
    expect(getAllowedOrderTransitions(OrderStatus.PAID)).toEqual([]);
    expect(getAllowedOrderTransitions(OrderStatus.CANCELLED)).toEqual([]);
  });
});
