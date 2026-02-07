export type ConfirmArgs = Readonly<{
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}>;

export type PromptSelectOption = Readonly<{ label: string; value: string }>;

export type FieldType = "text" | "textarea" | "select" | "number" | "date";

export type PromptField = Readonly<{
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: readonly PromptSelectOption[]; // for select
}>;

export type FormArgs<T extends Record<string, any>> = Readonly<{
  title: string;
  fields: readonly PromptField[];
  initial?: Partial<T>;
  confirmText?: string;
  cancelText?: string;
  /**
   * Return string to display error, or null if ok.
   */
  validate?: (v: T) => string | null;
}>;

export type PromptApi = Readonly<{
  confirm: (args: ConfirmArgs) => Promise<boolean>;
  form: <T extends Record<string, any>>(args: FormArgs<T>) => Promise<T | null>;
}>;

export default class PromptBridge {
  static #api: PromptApi | null = null;

  static bind(api: PromptApi): void {
    PromptBridge.#api = api;
  }

  static unbind(): void {
    PromptBridge.#api = null;
  }

  static api(): PromptApi {
    if (!PromptBridge.#api) {
      throw new Error(
        "[PromptBridge] Not bound. Mount PromptHost once in the app root.",
      );
    }
    return PromptBridge.#api;
  }
}
