import { computed } from "vue";
import MainViewRegistryData from "../../../components/shell/MainViewRegistry";
import MainViewController from "../../../components/shell/MainViewController";

export function useAppShell() {
  const controller = new MainViewController(MainViewRegistryData, {
    defaultKey: "dashboard",
    storageKeyActive: "ui.main.activeView",
    storageKeyCollapsed: "ui.aside.collapsed",
  });

  const Active = computed(() => controller.activeSpec.value.component);
  const toggleAside = () => controller.toggleOpen();

  return { controller, Active, toggleAside };
}
