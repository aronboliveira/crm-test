import type { LocationQuery, LocationQueryRaw } from "vue-router";
import TableQueryStateService, { QueryParsers } from "./TableQueryStateService";

export interface AdminAuditRouteState {
  q: string;
  kind: string;
}

export const ADMIN_AUDIT_ROUTE_QUERY_KEYS = Object.freeze({
  SEARCH: "q",
  KIND: "k",
} as const);

const DEFAULT_STATE: Readonly<AdminAuditRouteState> = Object.freeze({
  q: "",
  kind: "",
});

const queryState = new TableQueryStateService<AdminAuditRouteState>(
  {
    q: {
      key: ADMIN_AUDIT_ROUTE_QUERY_KEYS.SEARCH,
      parse: (raw) => QueryParsers.trimmedString(DEFAULT_STATE.q)(raw),
      serialize: (value) => {
        const normalized = QueryParsers.trimmedString(DEFAULT_STATE.q)(value);
        return normalized || undefined;
      },
    },
    kind: {
      key: ADMIN_AUDIT_ROUTE_QUERY_KEYS.KIND,
      parse: (raw) => QueryParsers.trimmedString(DEFAULT_STATE.kind)(raw),
      serialize: (value) => {
        const normalized = QueryParsers.trimmedString(DEFAULT_STATE.kind)(value);
        return normalized || undefined;
      },
    },
  },
  { ...DEFAULT_STATE },
);

export default class AdminAuditQueryStateService {
  static readonly defaults = DEFAULT_STATE;
  static readonly keys = ADMIN_AUDIT_ROUTE_QUERY_KEYS;

  static fromQuery(query: LocationQuery): AdminAuditRouteState {
    return queryState.fromQuery(query);
  }

  static toQuery(state: AdminAuditRouteState): LocationQueryRaw {
    return queryState.toQuery(state);
  }

  static isSameState(
    left: LocationQuery | AdminAuditRouteState,
    right: LocationQuery | AdminAuditRouteState,
  ): boolean {
    return queryState.isSameState(left, right);
  }
}
