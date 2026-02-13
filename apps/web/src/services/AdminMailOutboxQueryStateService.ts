import type { LocationQuery, LocationQueryRaw } from "vue-router";
import TableQueryStateService, { QueryParsers } from "./TableQueryStateService";

export interface AdminMailOutboxRouteState {
  q: string;
  kind: string;
}

export const ADMIN_MAIL_OUTBOX_ROUTE_QUERY_KEYS = Object.freeze({
  SEARCH: "q",
  KIND: "k",
} as const);

const DEFAULT_STATE: Readonly<AdminMailOutboxRouteState> = Object.freeze({
  q: "",
  kind: "",
});

const VALID_KIND_KEYS = Object.freeze(["", "password_invite", "generic"] as const);

const queryState = new TableQueryStateService<AdminMailOutboxRouteState>(
  {
    q: {
      key: ADMIN_MAIL_OUTBOX_ROUTE_QUERY_KEYS.SEARCH,
      parse: (raw) => QueryParsers.trimmedString(DEFAULT_STATE.q)(raw),
      serialize: (value) => {
        const normalized = QueryParsers.trimmedString(DEFAULT_STATE.q)(value);
        return normalized || undefined;
      },
    },
    kind: {
      key: ADMIN_MAIL_OUTBOX_ROUTE_QUERY_KEYS.KIND,
      parse: (raw) =>
        QueryParsers.enumValue(VALID_KIND_KEYS, DEFAULT_STATE.kind)(raw),
      serialize: (value) => {
        const normalized = QueryParsers.enumValue(
          VALID_KIND_KEYS,
          DEFAULT_STATE.kind,
        )(value);
        return normalized || undefined;
      },
    },
  },
  { ...DEFAULT_STATE },
);

export default class AdminMailOutboxQueryStateService {
  static readonly defaults = DEFAULT_STATE;
  static readonly keys = ADMIN_MAIL_OUTBOX_ROUTE_QUERY_KEYS;

  static fromQuery(query: LocationQuery): AdminMailOutboxRouteState {
    return queryState.fromQuery(query);
  }

  static toQuery(state: AdminMailOutboxRouteState): LocationQueryRaw {
    return queryState.toQuery(state);
  }

  static isSameState(
    left: LocationQuery | AdminMailOutboxRouteState,
    right: LocationQuery | AdminMailOutboxRouteState,
  ): boolean {
    return queryState.isSameState(left, right);
  }
}
