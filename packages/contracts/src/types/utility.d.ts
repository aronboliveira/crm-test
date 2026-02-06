export type DeepReadonly<T> =
  T extends (...a: any[]) => any ? T :
  T extends readonly (infer U)[] ? readonly DeepReadonly<U>[] :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

export type DeepMutable<T> =
  T extends (...a: any[]) => any ? T :
  T extends readonly (infer U)[] ? DeepMutable<U>[] :
  T extends object ? { -readonly [K in keyof T]: DeepMutable<T[K]> } :
  T;

export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | { [k: string]: JsonValue } | JsonValue[];

export type Narrow<T> =
  T extends string | number | boolean ? T :
  T extends [] ? [] :
  T extends object ? { [K in keyof T]: Narrow<T[K]> } : T;
