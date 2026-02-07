export type RoutePerm = string;

export type RouteMetaGuard = Readonly<{
  requiresAuth?: boolean;
  perm?: RoutePerm;
}>;
