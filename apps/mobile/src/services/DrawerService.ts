import { reactive } from "vue";
import type { Project, Task } from "@corp/contracts";
import { DeepSeal } from "@corp/foundations";

export type DrawerKind = "project" | "task" | null;

type DrawerState = {
  open: boolean;
  kind: DrawerKind;
  title: string;
  payload: unknown;
};

class DrawerService {
  #state = reactive(
    DeepSeal.apply<DrawerState>({
      open: false,
      kind: null,
      title: "",
      payload: null,
    }),
  );

  get state() {
    return this.#state;
  }

  open(kind: Exclude<DrawerKind, null>, title: string, payload: unknown): void {
    this.#state.kind = kind;
    this.#state.title = title;
    this.#state.payload = payload;
    this.#state.open ? void 0 : (this.#state.open = true);
  }

  close(): void {
    this.#state.open ? (this.#state.open = false) : void 0;
  }

  showProject(p: Project): void {
    this.open("project", `Project: ${p.name}`, p);
  }

  showTask(t: Task): void {
    this.open("task", `Task: ${t.title}`, t);
  }
}

export default new DrawerService();
