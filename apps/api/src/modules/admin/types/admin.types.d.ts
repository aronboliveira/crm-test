export type nlStr = string | null;

export type AdminUserRow = Readonly<{
  id: string;
  email: string;
  roleKey: string;
  tokenVersion: number;
  passwordUpdatedAt: nlStr;
  createdAt: nlStr;
  updatedAt: nlStr;
}>;

export type PagedResult<T> = Readonly<{
  items: readonly T[];
  nextCursor: nlStr;
}>;

export type AdminAuditSliceRow = Readonly<{
  id: string;
  kind: string;
  createdAt: string;
  actorEmailMasked?: string;
  targetEmailMasked?: string;
  meta?: Record<string, any>;
}>;

export type AdminUserDetails = Readonly<{
  user: AdminUserRow;
  audit: readonly AdminAuditSliceRow[];
}>;
