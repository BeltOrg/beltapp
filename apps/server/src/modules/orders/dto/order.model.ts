import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { OrderStatus } from '../enums/order-status.enum';

@ObjectType()
export class Order {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  ownerId!: string;

  @Field(() => ID, { nullable: true })
  walkerId!: string | null;

  @Field(() => ID)
  dogId!: string;

  @Field(() => OrderStatus)
  status!: OrderStatus;

  @Field(() => Int)
  priceAmount!: number;

  @Field()
  priceCurrency!: string;

  @Field(() => Float)
  locationLat!: number;

  @Field(() => Float)
  locationLng!: number;

  @Field()
  locationAddress!: string;

  @Field(() => Date)
  startTime!: Date;

  @Field(() => Date)
  endTime!: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Date, { nullable: true })
  acceptedAt!: Date | null;

  @Field(() => Date, { nullable: true })
  startedAt!: Date | null;

  @Field(() => Date, { nullable: true })
  finishedAt!: Date | null;

  @Field(() => Date, { nullable: true })
  cancelledAt!: Date | null;

  @Field(() => Date, { nullable: true })
  paidAt!: Date | null;
}
