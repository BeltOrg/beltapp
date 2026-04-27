import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CancelOrderInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(240)
  reason?: string | null;
}
