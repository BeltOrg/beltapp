import { Field, InputType } from '@nestjs/graphql';
import { Length } from 'class-validator';

@InputType()
export class LogoutInput {
  @Field()
  @Length(16, 512)
  refreshToken!: string;
}
