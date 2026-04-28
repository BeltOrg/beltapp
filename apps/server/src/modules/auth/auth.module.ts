import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { AuthAccountEntity } from './entities/auth-account.entity';
import { AuthRefreshTokenEntity } from './entities/auth-refresh-token.entity';
import { GraphqlAuthGuard } from './graphql-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { UserEntity } from '../users/entities/user.entity';

export const AUTH_GRAPHQL_RESOLVERS = [AuthResolver] as const;

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      AuthAccountEntity,
      AuthRefreshTokenEntity,
      UserEntity,
    ]),
  ],
  providers: [
    AuthService,
    GraphqlAuthGuard,
    JwtStrategy,
    LocalStrategy,
    ...AUTH_GRAPHQL_RESOLVERS,
  ],
  exports: [AuthService, GraphqlAuthGuard],
})
export class AuthModule {}
