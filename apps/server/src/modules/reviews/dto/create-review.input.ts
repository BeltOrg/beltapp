import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';

@InputType()
export class CreateReviewInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(500)
  comment?: string | null;
}
