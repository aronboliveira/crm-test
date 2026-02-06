import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import AlertService from "../services/AlertService";
import AuthService from "../services/AuthService";
import AuthRecoveryService from "../services/AuthRecoveryService";

const FORM_ID = "auth_login_form";
const PERSIST_KEY = `form.${FORM_ID}`;

type Persisted = { email?: string; password?: string };

function looksLikeEmail(v: string): boolean {
  const s = (v || "").trim();
  return s.includes("@") && s.includes(".") && !s.includes(" ");
}

export default function AuthLoginScreen() {
  const nav = useNavigation<any>();

  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Useful for focusing password after email submit
  const passRef = useRef<TextInput | null>(null);

  const persist = useCallback(async (patch: Persisted) => {
    try {
      const raw = await AsyncStorage.getItem(PERSIST_KEY);
      const prev = raw ? (JSON.parse(raw) as Persisted) : {};
      const next: Persisted = { ...prev, ...patch };
      await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("[AuthLoginScreen] persist failed:", e);
    }
  }, []);

  const loadPersisted = useCallback(async (): Promise<Persisted | null> => {
    try {
      const raw = await AsyncStorage.getItem(PERSIST_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== "object") return null;

      return {
        email: typeof parsed.email === "string" ? parsed.email : undefined,
        password:
          typeof parsed.password === "string" ? parsed.password : undefined,
      };
    } catch (e) {
      console.error("[AuthLoginScreen] loadPersisted failed:", e);
      return null;
    }
  }, []);

  const submit = useCallback(async () => {
    if (busy) return;

    setBusy(true);
    try {
      const e = (email || "").trim();
      const p = (password || "").trim();

      if (!e) {
        await AlertService.error("Login failed", "Email is required");
        return;
      }
      if (!looksLikeEmail(e)) {
        await AlertService.error("Login failed", "Enter a valid email");
        return;
      }
      if (!p) {
        await AlertService.error("Login failed", "Password is required");
        return;
      }

      await AuthService.login(e, p);

      if (!AuthService.isAuthed()) {
        await AlertService.error("Login failed", "Token not received");
        return;
      }

      // Optional: you may want to clear password persistence on success
      // await persist({ password: "" });

      nav.replace("Home"); // map to "/"
    } catch (err) {
      console.error("[AuthLoginScreen] submit failed:", err);
      await AlertService.error("Login failed", err);
    } finally {
      setBusy(false);
    }
  }, [busy, email, password, nav]);

  useEffect(() => {
    (async () => {
      try {
        // 1) Prefer email from recovery flow
        const last = AuthRecoveryService.lastEmail?.() || "";
        if (last && !email) {
          setEmail(last);
          await persist({ email: last });
        }

        // 2) Restore persisted form values (if fields are still empty)
        const saved = await loadPersisted();
        if (saved) {
          if (!email && saved.email) setEmail(saved.email);
          if (!password && saved.password) setPassword(saved.password);
        }
      } catch (e) {
        console.error("[AuthLoginScreen] mount failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPersisted, persist]);

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card} accessibilityLabel="Authentication">
        <View style={styles.cardHead}>
          <Text style={styles.title}>Sign in</Text>
        </View>

        <View style={styles.form} accessibilityLabel="Login form">
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                void persist({ email: v });
              }}
              placeholder="admin@corp.local"
              accessibilityLabel="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              editable={!busy}
              style={[styles.input, busy && styles.inputDisabled]}
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={(r) => (passRef.current = r)}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                void persist({ password: v });
              }}
              placeholder="Admin#123"
              accessibilityLabel="Password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              editable={!busy}
              style={[styles.input, busy && styles.inputDisabled]}
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => void submit()}
              disabled={busy}
              accessibilityLabel="Sign in"
              style={({ pressed }) => [
                styles.btnPrimary,
                busy && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              {busy ? (
                <View style={styles.busyInline}>
                  <ActivityIndicator />
                  <Text style={styles.btnText}>Signing in…</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Sign in</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.links}>
            <Pressable
              onPress={() => nav.navigate("ForgotPassword")}
              accessibilityLabel="Forgot your password"
              disabled={busy}
            >
              <Text style={[styles.link, busy && styles.btnDisabled]}>
                Forgot your password?
              </Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Mock users (seed): admin@corp.local / Admin#123, manager@corp.local
            / Manager#123, member@corp.local / Member#123, viewer@corp.local /
            Viewer#123
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, justifyContent: "center" },

  card: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(20,20,24,0.95)",
    overflow: "hidden",
  },
  cardHead: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(120,120,140,0.22)",
  },
  title: { fontSize: 20, fontWeight: "800" },

  form: { padding: 14, gap: 12 },

  field: { gap: 6 },
  label: { fontWeight: "700" },

  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabled: { opacity: 0.55 },

  actions: { alignItems: "flex-end" },

  btnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnText: { fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },

  busyInline: { flexDirection: "row", alignItems: "center", gap: 10 },

  links: { alignItems: "center", paddingTop: 4 },
  link: {
    fontWeight: "700",
    textDecorationLine: "underline",
    opacity: 0.9,
  },

  hint: { opacity: 0.75, fontSize: 12, lineHeight: 16, paddingTop: 4 },
});
