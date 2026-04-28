import { Field, InputType } from '@nestjs/graphql';
import { Length } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @Length(3, 32)
  phone!: string;

  @Field()
  @Length(8, 128)
  password!: string;
}
