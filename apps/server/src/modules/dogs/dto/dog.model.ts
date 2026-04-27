import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DogBehavior } from '../enums/dog-behavior.enum';
import { DogSize } from '../enums/dog-size.enum';

@ObjectType()
export class Dog {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  ownerId!: string;

  @Field()
  name!: string;

  @Field(() => DogSize)
  size!: DogSize;

  @Field(() => [DogBehavior])
  behaviorTags!: DogBehavior[];

  @Field(() => String, { nullable: true })
  notes!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
