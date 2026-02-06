export type RouteMetaGuard = Readonly<{
  requiresAuth?: boolean;
  perm?: string;
}>;
