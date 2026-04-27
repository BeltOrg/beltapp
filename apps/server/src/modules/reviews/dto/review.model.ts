import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Review {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID)
  reviewerId!: string;

  @Field(() => ID)
  revieweeId!: string;

  @Field(() => Int)
  rating!: number;

  @Field(() => String, { nullable: true })
  comment!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
