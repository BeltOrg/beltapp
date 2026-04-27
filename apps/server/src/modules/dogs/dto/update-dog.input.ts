import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, Length, MaxLength } from 'class-validator';
import { DogBehavior } from '../enums/dog-behavior.enum';
import { DogSize } from '../enums/dog-size.enum';

@InputType()
export class UpdateDogInput {
  @Field({ nullable: true })
  @IsOptional()
  @Length(1, 80)
  name?: string;

  @Field(() => DogSize, { nullable: true })
  @IsOptional()
  @IsEnum(DogSize)
  size?: DogSize;

  @Field(() => [DogBehavior], { nullable: true })
  @IsOptional()
  @IsEnum(DogBehavior, { each: true })
  behaviorTags?: DogBehavior[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(500)
  notes?: string | null;
}
