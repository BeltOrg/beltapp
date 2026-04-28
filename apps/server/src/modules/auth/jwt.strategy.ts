import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { mapUser } from '../users/users.mapper';
import { AuthenticatedRequestUser } from './auth-context';
import { getAuthTokenConfig } from './auth.config';
import { AuthService } from './auth.service';

type AccessTokenPayload = {
  sub?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authService: AuthService) {
    const config = getAuthTokenConfig();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.accessTokenSecret,
      issuer: config.issuer,
      audience: config.audience,
    });
  }

  async validate(
    payload: AccessTokenPayload,
  ): Promise<AuthenticatedRequestUser> {
    const userId = Number.parseInt(payload.sub ?? '', 10);
    const user = await this.authService.requireJwtUser(userId);
    const mappedUser = mapUser(user);

    return {
      id: Number(mappedUser.id),
      phone: mappedUser.phone,
      roles: mappedUser.roles,
    };
  }
}
