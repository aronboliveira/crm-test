import { computed, ref, type Ref } from "vue";
import StorageService from "../../services/StorageService";
import type { MainViewRegistry, MainViewSpec } from "./MainViewRegistry";

type MainViewControllerOpts<K extends string> = Readonly<{
  defaultKey: K;
  storageKeyActive: string;
  storageKeyCollapsed: string;
}>;

export default class MainViewController<K extends string> {
  readonly #reg: MainViewRegistry<K>;
  readonly #opts: MainViewControllerOpts<K>;

  readonly #active: Ref<K>;
  readonly #collapsed: Ref<boolean>;
  readonly #open: Ref<boolean>;

  constructor(reg: MainViewRegistry<K>, opts: MainViewControllerOpts<K>) {
    this.#reg = reg;
    this.#opts = opts;

    const active = StorageService.local.getStr(
      opts.storageKeyActive,
      opts.defaultKey,
    ) as K;
    const safeActive = this.#reg.byKey[active] ? active : opts.defaultKey;

    this.#active = ref(safeActive) as Ref<K>;
    this.#collapsed = ref(
      StorageService.local.getBool(opts.storageKeyCollapsed, false),
    );
    this.#open = ref(false);
  }

  get activeKey(): Ref<K> {
    return this.#active;
  }

  get collapsed(): Ref<boolean> {
    return this.#collapsed;
  }

  get open(): Ref<boolean> {
    return this.#open;
  }

  get items() {
    return computed<readonly MainViewSpec<K>[]>(() =>
      this.#reg.order.map((k) => this.#reg.byKey[k]),
    );
  }

  get activeSpec() {
    return computed<MainViewSpec<K>>(() => this.#reg.byKey[this.#active.value]);
  }

  setActive(k: K): void {
    this.#reg.byKey[k]
      ? ((this.#active.value = k),
        StorageService.local.setStr(this.#opts.storageKeyActive, k),
        this.close())
      : void 0;
  }

  toggleCollapsed(): void {
    const v = !this.#collapsed.value;
    this.#collapsed.value = v;
    StorageService.local.setBool(this.#opts.storageKeyCollapsed, v);
  }

  toggleOpen(): void {
    this.#open.value = !this.#open.value;
  }

  close(): void {
    this.#open.value ? (this.#open.value = false) : void 0;
  }
}
