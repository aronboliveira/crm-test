import type { Component } from "vue";

export type MainViewKey = "dashboard" | "projects" | "tasks";

export type MainViewSpec<K extends string> = Readonly<{
  key: K;
  label: string;
  ariaLabel: string;
  component: Component;
}>;

export type MainViewRegistry<K extends string> = Readonly<{
  order: readonly K[];
  byKey: Readonly<Record<K, MainViewSpec<K>>>;
}>;
