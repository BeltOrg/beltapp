import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class CreateOrderInput {
  @Field(() => ID)
  dogId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  priceAmount!: number;

  @Field({ defaultValue: 'EUR' })
  @IsOptional()
  @Length(3, 3)
  priceCurrency?: string;

  @Field(() => Float)
  @IsNumber()
  locationLat!: number;

  @Field(() => Float)
  @IsNumber()
  locationLng!: number;

  @Field()
  @MaxLength(240)
  locationAddress!: string;

  @Field(() => Date)
  startTime!: Date;

  @Field(() => Date)
  endTime!: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsPositive()
  estimatedDurationMinutes?: number | null;
}
