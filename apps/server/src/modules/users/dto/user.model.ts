import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { UserRole } from '../enums/user-role.enum';

@ObjectType()
export class User {
  @Field(() => ID)
  id!: string;

  @Field()
  phone!: string;

  @Field(() => [UserRole])
  roles!: UserRole[];

  @Field(() => Float)
  rating!: number;

  @Field()
  isVerified!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
