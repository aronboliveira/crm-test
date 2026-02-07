import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import PromptBridge, {
  type ConfirmArgs,
  type FormArgs,
  type PromptApi,
  type PromptField,
} from "../services/PromptBridge";

type PromptState =
  | { kind: "none" }
  | {
      kind: "confirm";
      args: ConfirmArgs;
      resolve: (v: boolean) => void;
    }
  | {
      kind: "form";
      args: FormArgs<any>;
      resolve: (v: any | null) => void;
    };

function buildInitial(
  fields: readonly PromptField[],
  initial?: Record<string, any>,
) {
  const out: Record<string, any> = { ...(initial || {}) };
  fields.forEach((f) => {
    if (out[f.key] !== undefined) return;
    if (f.type === "number") out[f.key] = "";
    else out[f.key] = "";
  });
  return out;
}

export default function PromptHost() {
  const [st, setSt] = useState<PromptState>({ kind: "none" });

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const openConfirm = useCallback((args: ConfirmArgs) => {
    return new Promise<boolean>((resolve) => {
      setSt({ kind: "confirm", args, resolve });
    });
  }, []);

  const openForm = useCallback(
    <T extends Record<string, any>>(args: FormArgs<T>) => {
      return new Promise<T | null>((resolve) => {
        setFormError(null);
        setFormValues(buildInitial(args.fields, args.initial as any));
        setSt({ kind: "form", args, resolve });
      });
    },
    [],
  );

  const api: PromptApi = useMemo(
    () => ({
      confirm: openConfirm,
      form: openForm,
    }),
    [openConfirm, openForm],
  );

  useEffect(() => {
    PromptBridge.bind(api);
    return () => PromptBridge.unbind();
  }, [api]);

  const close = useCallback(() => {
    setSt({ kind: "none" });
    setFormError(null);
    setFormValues({});
  }, []);

  const confirmCancel = useCallback(() => {
    if (st.kind !== "confirm") return;
    st.resolve(false);
    close();
  }, [st, close]);

  const confirmOk = useCallback(() => {
    if (st.kind !== "confirm") return;
    st.resolve(true);
    close();
  }, [st, close]);

  const formCancel = useCallback(() => {
    if (st.kind !== "form") return;
    st.resolve(null);
    close();
  }, [st, close]);

  const formOk = useCallback(() => {
    if (st.kind !== "form") return;

    const args = st.args;
    const v = formValues as any;

    // required checks
    for (const f of args.fields) {
      if (!f.required) continue;
      const raw = v?.[f.key];
      const ok = String(raw ?? "").trim().length > 0;
      if (!ok) {
        setFormError(`${f.label} is required`);
        return;
      }
    }

    // custom validate
    const msg = args.validate ? args.validate(v) : null;
    if (msg) {
      setFormError(msg);
      return;
    }

    st.resolve(v);
    close();
  }, [st, formValues, close]);

  const setField = useCallback((k: string, v: any) => {
    setFormError(null);
    setFormValues((p) => ({ ...p, [k]: v }));
  }, []);

  const visible = st.kind !== "none";

  const title =
    st.kind === "confirm"
      ? st.args.title
      : st.kind === "form"
        ? st.args.title
        : "";

  const confirmText =
    st.kind === "confirm"
      ? st.args.confirmText || "OK"
      : st.kind === "form"
        ? st.args.confirmText || "OK"
        : "OK";

  const cancelText =
    st.kind === "confirm"
      ? st.args.cancelText || "Cancel"
      : st.kind === "form"
        ? st.args.cancelText || "Cancel"
        : "Cancel";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        st.kind === "confirm"
          ? confirmCancel()
          : st.kind === "form"
            ? formCancel()
            : close();
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          st.kind === "confirm"
            ? confirmCancel()
            : st.kind === "form"
              ? formCancel()
              : close();
        }}
      >
        <Pressable
          style={styles.panel}
          onPress={() => void 0}
          accessibilityRole="dialog"
        >
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            {st.kind === "confirm" && st.args.message ? (
              <Text style={styles.sub}>{st.args.message}</Text>
            ) : null}
          </View>

          {st.kind === "form" ? (
            <View style={styles.body}>
              {st.args.fields.map((f) => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.label}>{f.label}</Text>

                  {f.type === "select" ? (
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={String(formValues?.[f.key] ?? "")}
                        onValueChange={(val) => setField(f.key, String(val))}
                      >
                        <Picker.Item label="Select..." value="" />
                        {(f.options || []).map((o) => (
                          <Picker.Item
                            key={o.value}
                            label={o.label}
                            value={o.value}
                          />
                        ))}
                      </Picker>
                    </View>
                  ) : (
                    <TextInput
                      value={String(formValues?.[f.key] ?? "")}
                      onChangeText={(t) => setField(f.key, t)}
                      placeholder={f.placeholder}
                      multiline={f.type === "textarea"}
                      keyboardType={f.type === "number" ? "numeric" : "default"}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[
                        styles.input,
                        f.type === "textarea" && styles.textarea,
                      ]}
                    />
                  )}

                  {f.type === "date" ? (
                    <Text style={styles.hint}>
                      Format: YYYY-MM-DD (optional)
                    </Text>
                  ) : null}
                </View>
              ))}

              {formError ? <Text style={styles.error}>{formError}</Text> : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              onPress={st.kind === "confirm" ? confirmCancel : formCancel}
            >
              <Text style={styles.btnText}>{cancelText}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                st.kind === "confirm" && st.args.destructive
                  ? styles.btnDanger
                  : styles.btnPrimary,
              ]}
              onPress={st.kind === "confirm" ? confirmOk : formOk}
            >
              <Text style={styles.btnText}>{confirmText}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 16,
  },
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(22,22,26,0.98)",
    overflow: "hidden",
  },
  head: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
    gap: 6,
  },
  title: { fontSize: 18, fontWeight: "900" },
  sub: { opacity: 0.75 },

  body: { padding: 14, gap: 12 },
  field: { gap: 6 },
  label: { fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    overflow: "hidden",
  },
  hint: { opacity: 0.65, fontSize: 12 },
  error: { color: "rgba(255,120,120,1)", fontWeight: "700" },

  actions: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnGhost: { backgroundColor: "transparent" },
  btnPrimary: { backgroundColor: "rgba(120,120,200,0.18)" },
  btnDanger: { backgroundColor: "rgba(220,80,80,0.22)" },
  btnText: { fontWeight: "800" },
});
