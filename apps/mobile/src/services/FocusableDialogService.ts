import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Platform,
  TextInput,
} from "react-native";
import type { RefObject } from "react";

type OpenOpts = Readonly<{ onClose: () => void }>;
type FocusableRef = RefObject<{ focus?: () => void } | null>;
type RootRef = RefObject<any>;

export default class FocusableDialogService {
  static #wired = new WeakSet<object>(); // replaces data-dialog-wired attr
  static #lastFocused: any | null = null; // best-effort
  static #backSub: { remove: () => void } | null = null;

  /**
   * @param rootRef Ref to the dialog container View (inside Modal/bottom sheet).
   * @param opts onClose callback
   * @param firstFocusRef Optional: ref to first focusable control (TextInput/Pressable supporting focus()).
   */
  static open(
    rootRef: RootRef,
    opts: OpenOpts,
    firstFocusRef?: FocusableRef,
  ): void {
    const rootObj = rootRef?.current as object | null;
    if (!rootObj) return;

    if (FocusableDialogService.#wired.has(rootObj)) return;
    FocusableDialogService.#wired.add(rootObj);

    // Capture currently focused input (best effort; used to restore on close)
    try {
      FocusableDialogService.#lastFocused =
        (TextInput as any)?.State?.currentlyFocusedInput?.() ?? null;
    } catch {
      FocusableDialogService.#lastFocused = null;
    }

    // Android back closes dialog
    FocusableDialogService.#backSub?.remove?.();
    FocusableDialogService.#backSub = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        try {
          opts.onClose();
        } catch {
          // ignore
        }
        return true;
      },
    );

    // Focus dialog content for screen readers (or focus first control if provided)
    FocusableDialogService.#focus(firstFocusRef ?? null, rootRef);
  }

  static close(): void {
    FocusableDialogService.#backSub?.remove?.();
    FocusableDialogService.#backSub = null;

    const last = FocusableDialogService.#lastFocused;
    FocusableDialogService.#lastFocused = null;

    // restore focus (mainly works for TextInput)
    try {
      last?.focus?.();
    } catch {
      // ignore
    }
  }

  static #focus(firstFocusRef: FocusableRef | null, rootRef: RootRef): void {
    // Defer until after Modal mount/layout
    setTimeout(
      () => {
        try {
          const focusable = firstFocusRef?.current;
          if (focusable && typeof (focusable as any).focus === "function") {
            (focusable as any).focus();
            return;
          }

          const node = rootRef?.current
            ? findNodeHandle(rootRef.current)
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
