import { Field, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsEnum, Length } from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum';

@InputType()
export class RegisterInput {
  @Field()
  @Length(3, 32)
  phone!: string;

  @Field()
  @Length(8, 128)
  password!: string;

  @Field(() => [UserRole])
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}
