export type nlStr = string | null;

export type AuditActor = Readonly<{
  userId: nlStr;
  email: nlStr;
}>;

export type AuditTarget = Readonly<{
  userId: nlStr;
  email: nlStr;
}>;

export type PagedResult<T> = Readonly<{
  items: readonly T[];
  nextCursor: nlStr;
}>;
