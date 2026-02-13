import type { LocationQuery, LocationQueryRaw } from "vue-router";
import type {
  DeviceKind,
  DeviceSortBy,
  DeviceSortDir,
  DeviceStatus,
} from "../pinia/types/devices.types";
import TableQueryStateService, { QueryParsers } from "./TableQueryStateService";

export interface DeviceRouteState {
  q: string;
  status: DeviceStatus | "all";
  kind: DeviceKind | "all";
  page: number;
  pageSize: number;
  sortBy: DeviceSortBy;
  sortDir: DeviceSortDir;
}

export const DEVICE_ROUTE_QUERY_KEYS = Object.freeze({
  SEARCH: "q",
  STATUS: "s",
  KIND: "k",
  PAGE: "p",
  PAGE_SIZE: "z",
  SORT_BY: "b",
  SORT_DIR: "d",
} as const);

const DEFAULT_STATE: Readonly<DeviceRouteState> = Object.freeze({
  q: "",
  status: "all",
  kind: "all",
  page: 1,
  pageSize: 10,
  sortBy: "updatedAt",
  sortDir: "desc",
});

const VALID_STATUS: readonly (DeviceStatus | "all")[] = Object.freeze([
  "all",
  "online",
  "offline",
  "maintenance",
]);
const VALID_KIND: readonly (DeviceKind | "all")[] = Object.freeze([
  "all",
  "physical",
  "virtual",
]);
const VALID_SORT_BY: readonly DeviceSortBy[] = Object.freeze([
  "updatedAt",
  "lastSeenAt",
  "name",
  "status",
  "kind",
  "vendor",
]);
const VALID_SORT_DIR: readonly DeviceSortDir[] = Object.freeze(["asc", "desc"]);

const queryState = new TableQueryStateService<DeviceRouteState>(
  {
    q: {
      key: DEVICE_ROUTE_QUERY_KEYS.SEARCH,
      parse: (raw) => QueryParsers.trimmedString(DEFAULT_STATE.q)(raw),
      serialize: (value) => {
        const normalized = QueryParsers.trimmedString(DEFAULT_STATE.q)(value);
        return normalized || undefined;
      },
    },
    status: {
      key: DEVICE_ROUTE_QUERY_KEYS.STATUS,
      parse: (raw) =>
        QueryParsers.enumValue(VALID_STATUS, DEFAULT_STATE.status)(raw),
    },
    kind: {
      key: DEVICE_ROUTE_QUERY_KEYS.KIND,
      parse: (raw) => QueryParsers.enumValue(VALID_KIND, DEFAULT_STATE.kind)(raw),
    },
    page: {
      key: DEVICE_ROUTE_QUERY_KEYS.PAGE,
      parse: (raw) =>
        QueryParsers.intClamped(DEFAULT_STATE.page, 1, 10_000)(raw),
      serialize: (value) => String(value),
    },
    pageSize: {
      key: DEVICE_ROUTE_QUERY_KEYS.PAGE_SIZE,
      parse: (raw) =>
        QueryParsers.intClamped(DEFAULT_STATE.pageSize, 5, 50)(raw),
      serialize: (value) => String(value),
    },
    sortBy: {
      key: DEVICE_ROUTE_QUERY_KEYS.SORT_BY,
      parse: (raw) =>
        QueryParsers.enumValue(VALID_SORT_BY, DEFAULT_STATE.sortBy)(raw),
    },
    sortDir: {
      key: DEVICE_ROUTE_QUERY_KEYS.SORT_DIR,
      parse: (raw) =>
        QueryParsers.enumValue(VALID_SORT_DIR, DEFAULT_STATE.sortDir)(raw),
    },
  },
  { ...DEFAULT_STATE },
);

export default class DeviceQueryStateService {
  static readonly defaults = DEFAULT_STATE;
  static readonly keys = DEVICE_ROUTE_QUERY_KEYS;

  static fromQuery(query: LocationQuery): DeviceRouteState {
    return queryState.fromQuery(query);
  }

  static toQuery(state: DeviceRouteState): LocationQueryRaw {
    return queryState.toQuery(state);
  }

  static isSameState(
    left: LocationQuery | DeviceRouteState,
    right: LocationQuery | DeviceRouteState,
  ): boolean {
    return queryState.isSameState(left, right);
  }
}
