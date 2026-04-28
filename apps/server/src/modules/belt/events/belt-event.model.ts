import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Dog } from '../../dogs/dto/dog.model';
import { Order } from '../../orders/dto/order.model';
import { Review } from '../../reviews/dto/review.model';
import { User } from '../../users/dto/user.model';
import { BeltEventType } from './belt-event-type.enum';

@ObjectType()
export class BeltEvent {
  @Field(() => ID)
  id!: string;

  @Field(() => BeltEventType)
  type!: BeltEventType;

  @Field(() => Date)
  occurredAt!: Date;

  @Field(() => ID)
  subjectId!: string;

  @Field(() => User, { nullable: true })
  user!: User | null;

  @Field(() => Dog, { nullable: true })
  dog!: Dog | null;

  @Field(() => Order, { nullable: true })
  order!: Order | null;

  @Field(() => Review, { nullable: true })
  review!: Review | null;
}

export type BeltEventPayload = {
  beltEvent: BeltEvent;
};
