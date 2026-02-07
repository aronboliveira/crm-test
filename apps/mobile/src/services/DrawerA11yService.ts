import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Platform,
  TextInput,
} from "react-native";
import type { RefObject } from "react";

type FocusableRef = RefObject<{ focus?: () => void } | null>;
type PanelRef = RefObject<any>;

export default class DrawerA11yService {
  static #panelRef: PanelRef | null = null;
  static #onClose: (() => void) | null = null;

  // Best-effort last focused “thing” (usually TextInput). Not guaranteed for all components.
  static #lastFocused: any | null = null;

  static #backSub: { remove: () => void } | null = null;

  /**
   * Open the drawer accessibility session.
   *
   * @param panelRef Ref to your drawer container (View inside Modal/BottomSheet).
   * @param onClose Callback invoked on Android back / request close.
   * @param firstFocusRef Optional ref to the first focusable control (TextInput / Pressable w/ focus()).
   */
  static open(
    panelRef: PanelRef,
    onClose: () => void,
    firstFocusRef?: FocusableRef,
  ): void {
    DrawerA11yService.#panelRef = panelRef;
    DrawerA11yService.#onClose = onClose;

    // Capture last focused input (best effort).
    try {
      // RN API varies; currentlyFocusedInput exists in modern RN.
      DrawerA11yService.#lastFocused =
        (TextInput as any)?.State?.currentlyFocusedInput?.() ?? null;
    } catch {
      DrawerA11yService.#lastFocused = null;
    }

    // Android back button closes modal/drawer.
    DrawerA11yService.#backSub?.remove?.();
    DrawerA11yService.#backSub = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        try {
          DrawerA11yService.#onClose?.();
        } catch {
          // ignore
        }
        return true; // handled
      },
    );

    // Focus: prefer first control; otherwise focus the panel container for screen readers.
    DrawerA11yService.#focus(firstFocusRef ?? null, panelRef);

    // Optional: announce (useful for screen readers).
    try {
      AccessibilityInfo.announceForAccessibility?.("Dialog opened");
    } catch {
      // ignore
    }
  }

  /**
   * Close the drawer accessibility session and restore focus when possible.
   */
  static close(): void {
    DrawerA11yService.#backSub?.remove?.();
    DrawerA11yService.#backSub = null;

    const last = DrawerA11yService.#lastFocused;

    DrawerA11yService.#panelRef = null;
    DrawerA11yService.#onClose = null;
    DrawerA11yService.#lastFocused = null;

    // Best-effort restore focus (works mainly for TextInput).
    try {
      last?.focus?.();
    } catch {
      // ignore
    }
  }

  static #focus(firstFocusRef: FocusableRef | null, panelRef: PanelRef): void {
    // Defer to allow layout/Modal mount.
    setTimeout(
      () => {
        try {
          // 1) Try focus() on provided first focusable.
          const focusable = firstFocusRef?.current;
          if (focusable && typeof (focusable as any).focus === "function") {
            (focusable as any).focus();
            return;
          }

          // 2) Otherwise set accessibility focus to the panel container.
          const node = panelRef?.current
            ? findNodeHandle(panelRef.current)
            : null;
          if (node) {
            AccessibilityInfo.setAccessibilityFocus?.(node);
          }
        } catch {
          // ignore
        }
      },
      Platform.OS === "android" ? 40 : 0,
    );
  }
}
