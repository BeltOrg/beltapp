import { parseNumber } from '../../config/env.utils';

export type AuthTokenConfig = {
  accessTokenSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  refreshTokenPepper: string;
  issuer: string;
  audience: string;
};

const DEVELOPMENT_ACCESS_SECRET = 'dev-only-belt-access-token-secret-change-me';
const DEVELOPMENT_REFRESH_PEPPER =
  'dev-only-belt-refresh-token-pepper-change-me';

function requireSecret(name: string, developmentFallback: string): string {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== 'production') {
    return developmentFallback;
  }

  throw new Error(`${name} must be set in production.`);
}

export function getAuthTokenConfig(): AuthTokenConfig {
  return {
    accessTokenSecret: requireSecret(
      'AUTH_JWT_ACCESS_SECRET',
      DEVELOPMENT_ACCESS_SECRET,
    ),
    accessTokenTtlSeconds: parseNumber(
      process.env.AUTH_JWT_ACCESS_TTL_SECONDS,
      15 * 60,
    ),
    refreshTokenTtlSeconds: parseNumber(
      process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
      30 * 24 * 60 * 60,
    ),
    refreshTokenPepper: requireSecret(
      'AUTH_REFRESH_TOKEN_PEPPER',
      DEVELOPMENT_REFRESH_PEPPER,
    ),
    issuer: process.env.AUTH_JWT_ISSUER?.trim() || 'belt-api',
    audience: process.env.AUTH_JWT_AUDIENCE?.trim() || 'belt-webapp',
  };
}
