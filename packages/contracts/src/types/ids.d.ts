export type Brand<T, B extends string> = T & { readonly __brand: B };

export type EntityId = Brand<string, "EntityId">;
export type ProjectId = Brand<string, "ProjectId">;
export type TaskId = Brand<string, "TaskId">;
