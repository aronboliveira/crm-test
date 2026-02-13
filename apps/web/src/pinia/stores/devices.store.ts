import { defineStore } from "pinia";
import ApiClientService from "../../services/ApiClientService";
import type {
  CreateDeviceDto,
  DeviceListQuery,
  DeviceSortBy,
  DeviceSortDir,
  DeviceRow,
  UpdateDeviceDto,
} from "../types/devices.types";

interface DevicesState {
  byId: Record<string, DeviceRow>;
  ids: string[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  nextCursor: string | null;
  sortBy: DeviceSortBy;
  sortDir: DeviceSortDir;
  query: DeviceListQuery;
}

type NormalizedDeviceListQuery = {
  q: string;
  status?: DeviceListQuery["status"];
  kind?: DeviceListQuery["kind"];
  page: number;
  pageSize: number;
  sortBy: DeviceSortBy;
  sortDir: DeviceSortDir;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY: DeviceSortBy = "updatedAt";
const DEFAULT_SORT_DIR: DeviceSortDir = "desc";

const DEFAULT_QUERY: Readonly<DeviceListQuery> = Object.freeze({
  q: "",
  status: undefined,
  kind: undefined,
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  sortBy: DEFAULT_SORT_BY,
  sortDir: DEFAULT_SORT_DIR,
});

const VALID_SORT_BY: readonly DeviceSortBy[] = Object.freeze([
  "updatedAt",
  "lastSeenAt",
  "name",
  "status",
  "kind",
  "vendor",
]);

const normalizeSortBy = (value: unknown): DeviceSortBy =>
  typeof value === "string" && VALID_SORT_BY.includes(value as DeviceSortBy)
    ? (value as DeviceSortBy)
    : DEFAULT_SORT_BY;

const normalizeSortDir = (value: unknown): DeviceSortDir =>
  String(value || "").toLowerCase() === "asc" ? "asc" : DEFAULT_SORT_DIR;

const clampInt = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  const parsed =
    typeof value === "number"
      ? Math.trunc(value)
      : Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
};

const normalizeQuery = (
  args: DeviceListQuery | undefined,
  current: DeviceListQuery,
): NormalizedDeviceListQuery => ({
  q: typeof args?.q === "string" ? args.q : current.q || DEFAULT_QUERY.q || "",
  status:
    args?.status === "online" ||
    args?.status === "offline" ||
    args?.status === "maintenance"
      ? args.status
      : undefined,
  kind: args?.kind === "physical" || args?.kind === "virtual" ? args.kind : undefined,
  page: clampInt(args?.page ?? current.page, DEFAULT_PAGE, 1, 10_000),
  pageSize: clampInt(
    args?.pageSize ?? current.pageSize,
    DEFAULT_PAGE_SIZE,
    5,
    50,
  ),
  sortBy: normalizeSortBy(args?.sortBy ?? current.sortBy ?? DEFAULT_SORT_BY),
  sortDir: normalizeSortDir(args?.sortDir ?? current.sortDir ?? DEFAULT_SORT_DIR),
});

const normalizeDeviceId = (item: any): string => {
  const id = item?.id ?? item?._id;
  if (typeof id === "string") {
    return id;
  }
  if (id && typeof id.toString === "function") {
    return String(id.toString());
  }
  return "";
};

export const useDevicesStore = defineStore("devices", {
  state: (): DevicesState => ({
    byId: {},
    ids: [],
    loading: false,
    saving: false,
    error: null,
    total: 0,
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
    nextCursor: null,
    sortBy: DEFAULT_SORT_BY,
    sortDir: DEFAULT_SORT_DIR,
    query: { ...DEFAULT_QUERY },
  }),

  getters: {
    rows: (state): DeviceRow[] =>
      state.ids
        .map((id) => state.byId[id])
        .filter((row): row is DeviceRow => !!row),
  },

  actions: {
    async list(args?: DeviceListQuery) {
      this.loading = true;
      this.error = null;
      try {
        const normalizedQuery = normalizeQuery(args, this.query);
        const response = await ApiClientService.devices.list(normalizedQuery);
        const items = Array.isArray(response?.items) ? response.items : [];
        this.byId = {};
        this.ids = [];

        items.forEach((item: any) => {
          const normalizedId = normalizeDeviceId(item);
          if (!normalizedId) {
            return;
          }
          const row: DeviceRow = {
            id: normalizedId,
            ownerEmail: String(item.ownerEmail || "").toLowerCase(),
            name: String(item.name || ""),
            kind: item.kind === "virtual" ? "virtual" : "physical",
            vendor: item.vendor,
            model: item.model,
            operatingSystem: item.operatingSystem,
            host: item.host,
            ipAddress: item.ipAddress,
            serialNumber: item.serialNumber,
            status:
              item.status === "online" ||
              item.status === "maintenance" ||
              item.status === "offline"
                ? item.status
                : "offline",
            tags: Array.isArray(item.tags)
              ? item.tags.filter((entry: unknown) => typeof entry === "string")
              : [],
            lastSeenAt:
              typeof item.lastSeenAt === "string" ? item.lastSeenAt : undefined,
            createdAt: String(item.createdAt || ""),
            updatedAt: String(item.updatedAt || ""),
          };
          this.byId[row.id] = row;
          this.ids.push(row.id);
        });

        const total = Number.isFinite(response?.total)
          ? Math.max(0, Math.trunc(response.total))
          : items.length;
        const pageSize = clampInt(
          response?.pageSize,
          normalizedQuery.pageSize,
          5,
          50,
        );
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = clampInt(response?.page, normalizedQuery.page, 1, totalPages);

        this.total = total;
        this.page = page;
        this.pageSize = pageSize;
        this.nextCursor =
          typeof response?.nextCursor === "string" ? response.nextCursor : null;
        this.sortBy = normalizeSortBy(response?.sortBy ?? normalizedQuery.sortBy);
        this.sortDir = normalizeSortDir(response?.sortDir ?? normalizedQuery.sortDir);
        this.query = {
          q: normalizedQuery.q,
          status: normalizedQuery.status,
          kind: normalizedQuery.kind,
          page: page,
          pageSize,
          sortBy: this.sortBy,
          sortDir: this.sortDir,
        };
      } catch (caughtError: any) {
        console.error("[devices.store] list failed:", caughtError);
        this.error = caughtError?.message
          ? String(caughtError.message)
          : "Falha ao carregar dispositivos";
      } finally {
        this.loading = false;
      }
    },

    async create(payload: CreateDeviceDto): Promise<void> {
      this.saving = true;
      this.error = null;
      try {
        await ApiClientService.devices.create(payload);
        await this.list(this.query);
      } catch (caughtError: any) {
        console.error("[devices.store] create failed:", caughtError);
        this.error = caughtError?.message
          ? String(caughtError.message)
          : "Falha ao criar dispositivo";
        throw caughtError;
      } finally {
        this.saving = false;
      }
    },

    async update(id: string, payload: UpdateDeviceDto): Promise<void> {
      this.saving = true;
      this.error = null;
      try {
        await ApiClientService.devices.update(id, payload);
        await this.list(this.query);
      } catch (caughtError: any) {
        console.error("[devices.store] update failed:", caughtError);
        this.error = caughtError?.message
          ? String(caughtError.message)
          : "Falha ao atualizar dispositivo";
        throw caughtError;
      } finally {
        this.saving = false;
      }
    },

    async remove(id: string): Promise<void> {
      this.saving = true;
      this.error = null;
      try {
        await ApiClientService.devices.remove(id);
        await this.list(this.query);
      } catch (caughtError: any) {
        console.error("[devices.store] remove failed:", caughtError);
        this.error = caughtError?.message
          ? String(caughtError.message)
          : "Falha ao remover dispositivo";
        throw caughtError;
      } finally {
        this.saving = false;
      }
    },
  },
});
