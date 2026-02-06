import type { PermissionKey, RoleKey } from './permissions';

export type JwtPayload = Readonly<{
  sub: string;
  email: string;
  roles: readonly RoleKey[];
  perms: readonly PermissionKey[];
}>;
