export type AuthJwtPayload = Readonly<{
  sub: string;
  email: string;
  role: string;
  perms: readonly string[];
  tv: number;
}>;
