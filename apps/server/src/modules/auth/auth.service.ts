import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { Repository } from 'typeorm';
import { mapUser } from '../users/users.mapper';
import { UserRole } from '../users/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { AuthPayload } from './dto/auth-payload.model';
import {
  AuthAccountEntity,
  LOCAL_AUTH_PROVIDER,
} from './entities/auth-account.entity';
import { AuthRefreshTokenEntity } from './entities/auth-refresh-token.entity';
import { getAuthTokenConfig } from './auth.config';
import * as argon2 from 'argon2';

type RefreshTokenIssue = {
  entity: AuthRefreshTokenEntity;
  rawToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AuthAccountEntity)
    private readonly accountsRepository: Repository<AuthAccountEntity>,
    @InjectRepository(AuthRefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<AuthRefreshTokenEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async registerLocal(input: {
    phone: string;
    password: string;
    roles: UserRole[];
  }): Promise<AuthPayload> {
    const phone = normalizePhone(input.phone);
    const roles = normalizeRoles(input.roles);
    const passwordHash = await argon2.hash(input.password);

    const existingAccount = await this.accountsRepository.findOneBy({
      provider: LOCAL_AUTH_PROVIDER,
      providerSubject: phone,
    });

    if (existingAccount) {
      throw new ConflictException({
        code: 'AUTH_ACCOUNT_EXISTS',
        message: 'An account already exists for this phone number.',
      });
    }

    const user = this.usersRepository.create({
      phone,
      roles,
      isVerified: true,
    });

    try {
      const savedUser = await this.usersRepository.manager.transaction(
        async (entityManager) => {
          const createdUser = await entityManager.save(UserEntity, user);
          const account = entityManager.create(AuthAccountEntity, {
            userId: createdUser.id,
            provider: LOCAL_AUTH_PROVIDER,
            providerSubject: phone,
            passwordHash,
          });
          await entityManager.save(AuthAccountEntity, account);
          return createdUser;
        },
      );

      return this.issueSession(savedUser);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'AUTH_ACCOUNT_EXISTS',
          message: 'An account already exists for this phone number.',
        });
      }

      throw error;
    }
  }

  async loginLocal(input: {
    phone: string;
    password: string;
  }): Promise<AuthPayload> {
    const user = await this.validateLocalCredentials(
      input.phone,
      input.password,
    );
    return this.issueSession(user);
  }

  async validateLocalCredentials(
    phone: string,
    password: string,
  ): Promise<UserEntity> {
    const account = await this.accountsRepository.findOne({
      where: {
        provider: LOCAL_AUTH_PROVIDER,
        providerSubject: normalizePhone(phone),
      },
      relations: {
        user: true,
      },
    });

    if (!account?.passwordHash) {
      throwInvalidCredentials();
    }

    const passwordMatches = await argon2.verify(account.passwordHash, password);
    if (!passwordMatches) {
      throwInvalidCredentials();
    }

    return account.user;
  }

  async refreshSession(refreshToken: string): Promise<AuthPayload> {
    const tokenHash = hashRefreshToken(refreshToken);

    return this.refreshTokensRepository.manager.transaction(
      async (entityManager) => {
        const storedToken = await entityManager.findOne(
          AuthRefreshTokenEntity,
          {
            where: { tokenHash },
            lock: { mode: 'pessimistic_write' },
          },
        );

        if (
          !storedToken ||
          storedToken.revokedAt !== null ||
          storedToken.expiresAt.getTime() <= Date.now()
        ) {
          throw new UnauthorizedException({
            code: 'AUTH_INVALID_REFRESH_TOKEN',
            message: 'Refresh token is invalid or expired.',
          });
        }

        const user = await entityManager.findOneBy(UserEntity, {
          id: storedToken.userId,
        });
        if (!user) {
          throw new UnauthorizedException({
            code: 'AUTH_INVALID_REFRESH_TOKEN',
            message: 'Refresh token user was not found.',
          });
        }

        const now = new Date();
        const nextRefreshToken = this.buildRefreshTokenEntity(user);
        storedToken.revokedAt = now;
        storedToken.replacedByTokenId = nextRefreshToken.entity.id;

        await entityManager.save(
          AuthRefreshTokenEntity,
          nextRefreshToken.entity,
        );
        await entityManager.save(AuthRefreshTokenEntity, storedToken);

        return this.buildPayload(user, nextRefreshToken.rawToken);
      },
    );
  }

  async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokensRepository.findOneBy({
      tokenHash,
    });

    if (!storedToken || storedToken.revokedAt !== null) {
      return true;
    }

    storedToken.revokedAt = new Date();
    await this.refreshTokensRepository.save(storedToken);
    return true;
  }

  async requireJwtUser(userId: number): Promise<UserEntity> {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_TOKEN',
        message: 'Access token subject is invalid.',
      });
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_TOKEN',
        message: 'Access token user was not found.',
      });
    }

    return user;
  }

  private async issueSession(user: UserEntity): Promise<AuthPayload> {
    const refreshToken = await this.createRefreshToken(user);
    return this.buildPayload(user, refreshToken.rawToken);
  }

  private buildPayload(user: UserEntity, refreshToken: string): AuthPayload {
    const config = getAuthTokenConfig();

    return {
      accessToken: this.jwtService.sign(
        {
          sub: String(user.id),
        },
        {
          secret: config.accessTokenSecret,
          expiresIn: config.accessTokenTtlSeconds,
          issuer: config.issuer,
          audience: config.audience,
        },
      ),
      refreshToken,
      expiresIn: config.accessTokenTtlSeconds,
      user: mapUser(user),
    };
  }

  private async createRefreshToken(
    user: UserEntity,
  ): Promise<RefreshTokenIssue> {
    const refreshToken = this.buildRefreshTokenEntity(user);

    return {
      entity: await this.refreshTokensRepository.save(refreshToken.entity),
      rawToken: refreshToken.rawToken,
    };
  }

  private buildRefreshTokenEntity(user: UserEntity): RefreshTokenIssue {
    const config = getAuthTokenConfig();
    const rawToken = randomBytes(48).toString('base64url');

    return {
      entity: this.refreshTokensRepository.create({
        id: randomUUID(),
        userId: user.id,
        user,
        tokenHash: hashRefreshToken(rawToken),
        expiresAt: new Date(Date.now() + config.refreshTokenTtlSeconds * 1000),
        revokedAt: null,
        replacedByTokenId: null,
      }),
      rawToken,
    };
  }
}

function normalizePhone(phone: string): string {
  return phone.trim();
}

function normalizeRoles(roles: UserRole[]): UserRole[] {
  const normalizedRoles = [...new Set(roles)];
  return normalizedRoles.length > 0 ? normalizedRoles : [UserRole.OWNER];
}

function hashRefreshToken(refreshToken: string): string {
  const config = getAuthTokenConfig();
  return createHash('sha256')
    .update(config.refreshTokenPepper)
    .update(refreshToken)
    .digest('hex');
}

function throwInvalidCredentials(): never {
  throw new UnauthorizedException({
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Phone or password is invalid.',
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}
