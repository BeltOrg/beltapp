import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthPayload } from './dto/auth-payload.model';
import { LoginInput } from './dto/login.input';
import { LogoutInput } from './dto/logout.input';
import { RefreshSessionInput } from './dto/refresh-session.input';
import { RegisterInput } from './dto/register.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  register(@Args('input') input: RegisterInput): Promise<AuthPayload> {
    return this.authService.registerLocal(input);
  }

  @Mutation(() => AuthPayload)
  login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    return this.authService.loginLocal(input);
  }

  @Mutation(() => AuthPayload)
  refreshSession(
    @Args('input') input: RefreshSessionInput,
  ): Promise<AuthPayload> {
    return this.authService.refreshSession(input.refreshToken);
  }

  @Mutation(() => Boolean)
  logout(@Args('input') input: LogoutInput): Promise<boolean> {
    return this.authService.revokeRefreshToken(input.refreshToken);
  }
}
