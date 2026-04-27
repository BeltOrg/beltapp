import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  OWNER = 'OWNER',
  WALKER = 'WALKER',
}

registerEnumType(UserRole, {
  name: 'UserRole',
});
