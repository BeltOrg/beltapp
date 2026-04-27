import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, Length, MaxLength } from 'class-validator';
import { DogBehavior } from '../enums/dog-behavior.enum';
import { DogSize } from '../enums/dog-size.enum';

@InputType()
export class CreateDogInput {
  @Field()
  @Length(1, 80)
  name!: string;

  @Field(() => DogSize)
  @IsEnum(DogSize)
  size!: DogSize;

  @Field(() => [DogBehavior], { defaultValue: [] })
  @IsEnum(DogBehavior, { each: true })
  behaviorTags!: DogBehavior[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(500)
  notes?: string | null;
}
