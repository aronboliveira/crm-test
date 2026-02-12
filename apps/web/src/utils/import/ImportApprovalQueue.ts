import type { ImportApprovalItem, ImportApprovalStatus } from "./ImportTypes";

type QueueItemPatch = Readonly<{
  status?: ImportApprovalStatus;
  error?: string;
  approved?: boolean;
}>;

export class ImportApprovalQueue<TPayload> {
  add(
    items: readonly ImportApprovalItem<TPayload>[],
    payload: TPayload,
    summary: string,
  ): ImportApprovalItem<TPayload>[] {
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `import_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return [
      ...items,
      {
        id,
        payload,
        summary,
        approved: true,
        status: "pending",
      },
    ];
  }

  remove(
    items: readonly ImportApprovalItem<TPayload>[],
    id: string,
  ): ImportApprovalItem<TPayload>[] {
    return items.filter((item) => item.id !== id);
  }

  toggleApproved(
    items: readonly ImportApprovalItem<TPayload>[],
    id: string,
  ): ImportApprovalItem<TPayload>[] {
    return items.map((item) =>
      item.id === id ? { ...item, approved: !item.approved } : item,
    );
  }

  patch(
    items: readonly ImportApprovalItem<TPayload>[],
    id: string,
    patch: QueueItemPatch,
  ): ImportApprovalItem<TPayload>[] {
    return items.map((item) =>
      item.id === id
        ? {
            ...item,
            ...patch,
          }
        : item,
    );
  }

  setAllApproved(
    items: readonly ImportApprovalItem<TPayload>[],
    approved: boolean,
  ): ImportApprovalItem<TPayload>[] {
    return items.map((item) => ({ ...item, approved }));
  }
}
