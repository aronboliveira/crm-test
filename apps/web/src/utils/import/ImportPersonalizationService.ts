import type { ImportColumnMapping } from "./ImportColumnMappingResolver";
import type { ImportEntityKind } from "./ImportTypes";

export type ImportMappingTemplate = Readonly<{
  id: string;
  name: string;
  kind: ImportEntityKind;
  columnMapping: ImportColumnMapping;
  defaultValues: Readonly<Record<string, string>>;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}>;

type TemplateWritePayload = Readonly<{
  name: string;
  kind: ImportEntityKind;
  columnMapping: ImportColumnMapping;
  defaultValues?: Readonly<Record<string, string>>;
}>;

type TemplateStoreByKind = Readonly<
  Record<ImportEntityKind, ImportMappingTemplate[]>
>;
type LastUsedTemplateByKind = Readonly<
  Partial<Record<ImportEntityKind, string>>
>;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type ImportPersonalizationServiceOptions = Readonly<{
  storage?: StorageLike;
  templatesKey?: string;
  lastUsedKey?: string;
}>;

const DEFAULT_TEMPLATES_KEY = "crm.import.templates.v1";
const DEFAULT_LAST_USED_KEY = "crm.import.templates.lastUsed.v1";
const DEFAULT_LAST_USED_SERVER_TEMPLATE_KEY =
  "crm.import.templates.lastUsed.server.v1";
const DEFAULT_TEMPLATE_STORE: TemplateStoreByKind = {
  clients: [],
  projects: [],
  users: [],
  tasks: [],
  leads: [],
};

const cleanText = (value: string): string => value.trim().replace(/\s+/g, " ");

const normalizeRecord = (
  values: Readonly<Record<string, string>> | undefined,
): Record<string, string> => {
  const normalized: Record<string, string> = {};
  Object.entries(values ?? {}).forEach(([key, value]) => {
    const normalizedKey = cleanText(key);
    if (!normalizedKey) return;
    const normalizedValue = cleanText(String(value ?? ""));
    if (!normalizedValue) return;
    normalized[normalizedKey] = normalizedValue;
  });
  return normalized;
};

export class ImportPersonalizationService {
  private readonly storage: StorageLike | null;
  private readonly templatesKey: string;
  private readonly lastUsedKey: string;
  private readonly lastUsedServerTemplateKey: string;

  constructor(options: ImportPersonalizationServiceOptions = {}) {
    const runtimeStorage =
      options.storage ??
      (typeof window !== "undefined" && window.localStorage
        ? window.localStorage
        : null);
    this.storage = runtimeStorage;
    this.templatesKey = options.templatesKey ?? DEFAULT_TEMPLATES_KEY;
    this.lastUsedKey = options.lastUsedKey ?? DEFAULT_LAST_USED_KEY;
    this.lastUsedServerTemplateKey = DEFAULT_LAST_USED_SERVER_TEMPLATE_KEY;
  }

  list(kind: ImportEntityKind): ImportMappingTemplate[] {
    return this.readTemplateStore()
      [kind].slice()
      .sort((left, right) => {
        if (right.usageCount !== left.usageCount) {
          return right.usageCount - left.usageCount;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }

  save(payload: TemplateWritePayload): ImportMappingTemplate {
    const name = cleanText(payload.name);
    if (!name) {
      throw new Error("Informe um nome de template.");
    }

    const store = this.readTemplateStore();
    const templates = [...store[payload.kind]];
    const existingIndex = templates.findIndex(
      (template) =>
        template.name.toLowerCase() === name.toLowerCase() &&
        template.kind === payload.kind,
    );
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      const current = templates[existingIndex];
      if (!current) {
        throw new Error("Template não encontrado.");
      }
      const updated: ImportMappingTemplate = {
        ...current,
        name,
        columnMapping: normalizeRecord(payload.columnMapping),
        defaultValues: normalizeRecord(payload.defaultValues),
        updatedAt: nowIso,
      };
      templates.splice(existingIndex, 1, updated);
      this.writeTemplateStore({
        ...store,
        [payload.kind]: templates,
      });
      return updated;
    }

    const created: ImportMappingTemplate = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `tmpl_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      kind: payload.kind,
      columnMapping: normalizeRecord(payload.columnMapping),
      defaultValues: normalizeRecord(payload.defaultValues),
      usageCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    templates.push(created);
    this.writeTemplateStore({
      ...store,
      [payload.kind]: templates,
    });
    return created;
  }

  delete(kind: ImportEntityKind, templateId: string): void {
    const targetId = cleanText(templateId);
    if (!targetId) return;
    const store = this.readTemplateStore();
    const templates = store[kind].filter(
      (template) => template.id !== targetId,
    );
    this.writeTemplateStore({
      ...store,
      [kind]: templates,
    });

    const lastUsed = this.readLastUsedStore();
    if (lastUsed[kind] === targetId) {
      const next: Partial<Record<ImportEntityKind, string>> = { ...lastUsed };
      delete next[kind];
      this.writeLastUsedStore(next);
    }
  }

  markAsUsed(
    kind: ImportEntityKind,
    templateId: string,
  ): ImportMappingTemplate | null {
    const targetId = cleanText(templateId);
    if (!targetId) return null;

    const store = this.readTemplateStore();
    const templates = [...store[kind]];
    const index = templates.findIndex((template) => template.id === targetId);
    if (index === -1) return null;
    const current = templates[index];
    if (!current) return null;
    const updated: ImportMappingTemplate = {
      ...current,
      usageCount: current.usageCount + 1,
      updatedAt: new Date().toISOString(),
    };
    templates.splice(index, 1, updated);
    this.writeTemplateStore({
      ...store,
      [kind]: templates,
    });
    this.writeLastUsedStore({
      ...this.readLastUsedStore(),
      [kind]: updated.id,
    });
    return updated;
  }

  getLastUsed(kind: ImportEntityKind): ImportMappingTemplate | null {
    const lastUsedByKind = this.readLastUsedStore();
    const targetId = lastUsedByKind[kind];
    if (!targetId) return null;
    return this.list(kind).find((template) => template.id === targetId) ?? null;
  }

  getLastUsedServerTemplateId(kind: ImportEntityKind): string | null {
    const store = this.readJson<Partial<Record<ImportEntityKind, unknown>>>(
      this.lastUsedServerTemplateKey,
      {},
    );
    const value = store[kind];
    return typeof value === "string" && cleanText(value)
      ? cleanText(value)
      : null;
  }

  setLastUsedServerTemplateId(
    kind: ImportEntityKind,
    templateId: string | null,
  ): void {
    const current = this.readJson<Partial<Record<ImportEntityKind, unknown>>>(
      this.lastUsedServerTemplateKey,
      {},
    );
    const next: Partial<Record<ImportEntityKind, string>> = {
      clients:
        typeof current.clients === "string" && cleanText(current.clients)
          ? cleanText(current.clients)
          : undefined,
      projects:
        typeof current.projects === "string" && cleanText(current.projects)
          ? cleanText(current.projects)
          : undefined,
      users:
        typeof current.users === "string" && cleanText(current.users)
          ? cleanText(current.users)
          : undefined,
    };

    if (templateId && cleanText(templateId)) {
      next[kind] = cleanText(templateId);
    } else {
      delete next[kind];
    }
    this.writeJson(this.lastUsedServerTemplateKey, next);
  }

  suggestNames(kind: ImportEntityKind, query: string, limit = 8): string[] {
    const needle = cleanText(query).toLowerCase();
    const templates = this.list(kind);
    const names = templates.map((template) => template.name);
    if (!needle) return names.slice(0, limit);
    return names
      .filter((name) => name.toLowerCase().includes(needle))
      .slice(0, limit);
  }

  private readTemplateStore(): TemplateStoreByKind {
    const parsed = this.readJson<Partial<Record<ImportEntityKind, unknown[]>>>(
      this.templatesKey,
      {},
    );
    return {
      clients: this.normalizeTemplates(parsed.clients, "clients"),
      projects: this.normalizeTemplates(parsed.projects, "projects"),
      users: this.normalizeTemplates(parsed.users, "users"),
      tasks: this.normalizeTemplates(parsed.tasks, "tasks"),
      leads: this.normalizeTemplates(parsed.leads, "leads"),
    };
  }

  private writeTemplateStore(store: TemplateStoreByKind): void {
    this.writeJson(this.templatesKey, store);
  }

  private readLastUsedStore(): LastUsedTemplateByKind {
    const parsed = this.readJson<Partial<Record<ImportEntityKind, unknown>>>(
      this.lastUsedKey,
      {},
    );
    return {
      clients:
        typeof parsed.clients === "string" && cleanText(parsed.clients)
          ? cleanText(parsed.clients)
          : undefined,
      projects:
        typeof parsed.projects === "string" && cleanText(parsed.projects)
          ? cleanText(parsed.projects)
          : undefined,
      users:
        typeof parsed.users === "string" && cleanText(parsed.users)
          ? cleanText(parsed.users)
          : undefined,
    };
  }

  private writeLastUsedStore(store: LastUsedTemplateByKind): void {
    this.writeJson(this.lastUsedKey, store);
  }

  private normalizeTemplates(
    value: unknown,
    kind: ImportEntityKind,
  ): ImportMappingTemplate[] {
    if (!Array.isArray(value)) {
      return [...DEFAULT_TEMPLATE_STORE[kind]];
    }

    return value
      .map((entry): ImportMappingTemplate | null => {
        if (!entry || typeof entry !== "object") return null;
        const raw = entry as Record<string, unknown>;
        const id = typeof raw.id === "string" ? cleanText(raw.id) : "";
        const name = typeof raw.name === "string" ? cleanText(raw.name) : "";
        if (!id || !name) return null;
        const usageCount =
          typeof raw.usageCount === "number" && Number.isFinite(raw.usageCount)
            ? Math.max(0, Math.floor(raw.usageCount))
            : 0;
        const createdAt =
          typeof raw.createdAt === "string" && cleanText(raw.createdAt)
            ? cleanText(raw.createdAt)
            : new Date(0).toISOString();
        const updatedAt =
          typeof raw.updatedAt === "string" && cleanText(raw.updatedAt)
            ? cleanText(raw.updatedAt)
            : createdAt;

        return {
          id,
          name,
          kind,
          columnMapping: normalizeRecord(
            (raw.columnMapping as Readonly<Record<string, string>>) ?? {},
          ),
          defaultValues: normalizeRecord(
            (raw.defaultValues as Readonly<Record<string, string>>) ?? {},
          ),
          usageCount,
          createdAt,
          updatedAt,
        };
      })
      .filter((entry): entry is ImportMappingTemplate => Boolean(entry));
  }

  private readJson<T>(key: string, fallback: T): T {
    if (!this.storage) return fallback;
    try {
      const raw = this.storage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private writeJson<T>(key: string, value: T): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      void 0;
    }
  }
}
