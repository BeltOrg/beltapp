import { Field, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsEnum } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

@InputType()
export class UpdateMyRolesInput {
  @Field(() => [UserRole])
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}
