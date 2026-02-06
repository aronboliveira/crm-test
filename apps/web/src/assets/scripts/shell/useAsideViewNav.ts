import type MainViewController from "../../../components/shell/MainViewController";
import type { MainViewKey } from "../../../types/views.types";

export interface AsideViewNavProps {
  controller: MainViewController<MainViewKey>;
}

export function useAsideViewNav(props: AsideViewNavProps) {
  const onPick = (k: MainViewKey) => {
    try {
      props.controller.setActive(k);
    } catch (e) {
      console.error("[AsideViewNav] onPick failed:", e);
    }
  };

  const toggle = () => {
    try {
      props.controller.toggleCollapsed();
    } catch (e) {
      console.error("[AsideViewNav] toggle failed:", e);
    }
  };

  const close = () => {
    try {
      props.controller.close();
    } catch (e) {
      console.error("[AsideViewNav] close failed:", e);
    }
  };

  const isActive = (k: MainViewKey) => {
    try {
      return props.controller.activeKey.value === k ? "is-active" : "";
    } catch (e) {
      console.error("[AsideViewNav] isActive failed:", e);
      return "";
    }
  };

  return { onPick, toggle, close, isActive };
}
