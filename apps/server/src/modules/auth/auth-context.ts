import { UserRole } from '../users/enums/user-role.enum';

export type AuthenticatedRequestUser = {
  id: number;
  phone: string;
  roles: UserRole[];
};

export type GraphqlRequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  raw?: GraphqlRequestLike;
  user?: AuthenticatedRequestUser;
};

export type BeltGraphqlContext = {
  req?: GraphqlRequestLike;
};

export function getCurrentUserIdFromContext(
  context: BeltGraphqlContext,
): number | null {
  return context.req?.user?.id ?? null;
}
