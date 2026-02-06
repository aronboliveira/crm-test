import { defineStore } from "pinia";

export const useBootstrapStore = defineStore("bootstrap", {
  state: () => ({ ready: false }),
  getters: { isReady: (s) => !!s.ready },
  actions: {
    markReady() {
      this.ready = true;
    },
  },
});
