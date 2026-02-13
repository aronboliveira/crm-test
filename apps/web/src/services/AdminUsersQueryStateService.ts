import type { LocationQuery, LocationQueryRaw } from "vue-router";
import TableQueryStateService, { QueryParsers } from "./TableQueryStateService";

export interface AdminUsersRouteState {
  q: string;
  roleKey: string;
}

export const ADMIN_USERS_ROUTE_QUERY_KEYS = Object.freeze({
  SEARCH: "q",
  ROLE_KEY: "r",
} as const);

const DEFAULT_STATE: Readonly<AdminUsersRouteState> = Object.freeze({
  q: "",
  roleKey: "",
});

const VALID_ROLE_KEYS = Object.freeze([
  "",
  "viewer",
  "member",
  "manager",
  "admin",
] as const);

const queryState = new TableQueryStateService<AdminUsersRouteState>(
  {
    q: {
      key: ADMIN_USERS_ROUTE_QUERY_KEYS.SEARCH,
      parse: (raw) => QueryParsers.trimmedString(DEFAULT_STATE.q)(raw),
      serialize: (value) => {
        const normalized = QueryParsers.trimmedString(DEFAULT_STATE.q)(value);
        return normalized || undefined;
      },
    },
    roleKey: {
      key: ADMIN_USERS_ROUTE_QUERY_KEYS.ROLE_KEY,
      parse: (raw) =>
        QueryParsers.enumValue(VALID_ROLE_KEYS, DEFAULT_STATE.roleKey)(raw),
      serialize: (value) => {
        const normalized = QueryParsers.enumValue(
          VALID_ROLE_KEYS,
          DEFAULT_STATE.roleKey,
        )(value);
        return normalized || undefined;
      },
    },
  },
  { ...DEFAULT_STATE },
);

export default class AdminUsersQueryStateService {
  static readonly defaults = DEFAULT_STATE;
  static readonly keys = ADMIN_USERS_ROUTE_QUERY_KEYS;

  static fromQuery(query: LocationQuery): AdminUsersRouteState {
    return queryState.fromQuery(query);
  }

  static toQuery(state: AdminUsersRouteState): LocationQueryRaw {
    return queryState.toQuery(state);
  }

  static isSameState(
    left: LocationQuery | AdminUsersRouteState,
    right: LocationQuery | AdminUsersRouteState,
  ): boolean {
    return queryState.isSameState(left, right);
  }
}
