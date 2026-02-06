export type nlStr = string | null;

export type AdminUserRow = Readonly<{
  id: string;
  email: string;
  roleKey: string;
  tokenVersion: number;
  passwordUpdatedAt: nlStr;
  createdAt: nlStr;
  updatedAt: nlStr;
  lockedAt?: nlStr;
  lockedReason?: nlStr;
}>;

export type AuditEventRow = Readonly<{
  _id: string;
  id?: string;
  kind: string;
  createdAt: string;
  actorEmail?: string;
  targetEmail?: string;
  actorEmailMasked?: string;
  targetEmailMasked?: string;
  meta?: Record<string, any>;
}>;

export type PagedResult<T> = Readonly<{
  items: readonly T[];
  nextCursor: nlStr;
}>;

export type AdminAuditSliceRow = Readonly<{
  _id?: string;
  id: string;
  kind: string;
  createdAt: string;
  actorEmail?: string;
  targetEmail?: string;
  actorEmailMasked?: string;
  targetEmailMasked?: string;
  meta?: Record<string, any>;
}>;

export type AdminUserDetails = Readonly<{
  user: AdminUserRow;
  audit: readonly AdminAuditSliceRow[];
}>;

export interface MailOutboxItem {
  _id?: string;
  to?: string;
  subject?: string;
  kind?: string;
  text?: string;
  meta?: Record<string, unknown>;
  createdAt?: string;
  [key: string]: unknown;
}
