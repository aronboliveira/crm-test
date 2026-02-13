import type { LocationQuery, LocationQueryRaw } from "vue-router";

type QueryInputValue = string | null | readonly (string | null)[] | undefined;

type QueryStateInput<TState extends object> = LocationQuery | TState;

type QueryFieldSpec<TState extends object, TValue> = Readonly<{
  key: string;
  parse: (raw: string | undefined, defaults: Readonly<TState>) => TValue;
  serialize?: (value: TValue, state: Readonly<TState>) => string | undefined;
  equals?: (left: TValue, right: TValue) => boolean;
}>;

export type QueryStateSchema<TState extends object> = Readonly<{
  [K in keyof TState]: QueryFieldSpec<TState, TState[K]>;
}>;

const pickFirst = (value: QueryInputValue): string | undefined => {
  if (Array.isArray(value)) {
    const first = value.find((entry): entry is string => typeof entry === "string");
    return first;
  }
  return typeof value === "string" ? value : undefined;
};

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const defaultSerialize = (value: unknown): string | undefined => {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }
  const serialized = String(value).trim();
  return serialized ? serialized : undefined;
};

const defaultEquals = (left: unknown, right: unknown): boolean => left === right;

const toSchemaKeys = <TState extends object>(
  schema: QueryStateSchema<TState>,
): (keyof TState)[] => Object.keys(schema) as (keyof TState)[];

export default class TableQueryStateService<TState extends object> {
  #schema: QueryStateSchema<TState>;
  #keys: (keyof TState)[];
  #defaults: Readonly<TState>;

  constructor(schema: QueryStateSchema<TState>, defaults: TState) {
    this.#schema = schema;
    this.#keys = toSchemaKeys(schema);
    this.#defaults = Object.freeze({ ...defaults });
  }

  get defaults(): Readonly<TState> {
    return this.#defaults;
  }

  fromQuery(query: LocationQuery): TState {
    const normalized = { ...this.#defaults } as TState;
    this.#keys.forEach((key) => {
      const field = this.#schema[key];
      const raw = pickFirst(query[field.key] as QueryInputValue);
      normalized[key] = field.parse(raw, this.#defaults);
    });
    return normalized;
  }

  toQuery(state: TState): LocationQueryRaw {
    const normalizedState = this.normalizeState(state);
    const query: LocationQueryRaw = {};
    this.#keys.forEach((key) => {
      const field = this.#schema[key];
      const equals = field.equals ?? defaultEquals;
      if (equals(normalizedState[key], this.#defaults[key])) {
        return;
      }
      const serialize = field.serialize ?? defaultSerialize;
      const serialized = serialize(normalizedState[key], normalizedState);
      if (typeof serialized === "string" && serialized.trim()) {
        query[field.key] = serialized.trim();
      }
    });
    return query;
  }

  isSameState(left: QueryStateInput<TState>, right: QueryStateInput<TState>): boolean {
    const normalizedLeft = this.normalizeInput(left);
    const normalizedRight = this.normalizeInput(right);
    return this.#keys.every((key) => {
      const field = this.#schema[key];
      const equals = field.equals ?? defaultEquals;
      return equals(normalizedLeft[key], normalizedRight[key]);
    });
  }

  normalizeState(state: TState): TState {
    const normalized = { ...this.#defaults } as TState;
    this.#keys.forEach((key) => {
      const field = this.#schema[key];
      const sourceValue = state[key];
      const serialize =
        field.serialize ??
        ((value: TState[typeof key]): string | undefined => defaultSerialize(value));
      const serialized = serialize(sourceValue, state);
      normalized[key] = field.parse(serialized, this.#defaults);
    });
    return normalized;
  }

  normalizeInput(input: QueryStateInput<TState>): TState {
    if (this.#isStateObject(input)) {
      return this.normalizeState(input);
    }
    return this.fromQuery(input as LocationQuery);
  }

  #isStateObject(value: QueryStateInput<TState>): value is TState {
    if (!isRecordObject(value)) {
      return false;
    }
    return this.#keys.every((key) =>
      Object.prototype.hasOwnProperty.call(value as Record<string, unknown>, key),
    );
  }
}

export const QueryParsers = Object.freeze({
  trimmedString:
    (fallback = "") =>
    (raw: string | undefined): string => {
      const normalized = String(raw || "").trim();
      return normalized || fallback;
    },
  enumValue:
    <T extends string>(allowed: readonly T[], fallback: T) =>
    (raw: string | undefined): T => {
      return raw && allowed.includes(raw as T) ? (raw as T) : fallback;
    },
  intClamped:
    (fallback: number, min: number, max: number) =>
    (raw: string | undefined): number => {
      const parsed = Number.parseInt(String(raw ?? fallback), 10);
      if (!Number.isFinite(parsed)) {
        return fallback;
      }
      return Math.min(max, Math.max(min, Math.trunc(parsed)));
    },
});
