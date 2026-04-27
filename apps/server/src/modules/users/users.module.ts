import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

export const USERS_GRAPHQL_RESOLVERS = [UsersResolver] as const;

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersService, ...USERS_GRAPHQL_RESOLVERS],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
