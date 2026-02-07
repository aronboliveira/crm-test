import React, { useCallback, useMemo, useState } from "react";
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
import Clipboard from "@react-native-clipboard/clipboard";
import { useNavigation } from "@react-navigation/native";
import AlertService from "../services/AlertService";
import AuthRecoveryService from "../services/AuthRecoveryService";

const FORM_ID = "reset_password_form";

// Keep it pragmatic: token format validation is app-specific.
// If you already have a validator in your shared code, plug it in here.
function looksLikeToken(v: string): boolean {
  const s = String(v || "").trim();
  // Accept UUID-like and common base64-ish / url-safe tokens.
  // Reject very short garbage.
  if (s.length < 16) return false;
  return /^[A-Za-z0-9\-_=.]+$/.test(s) || /^[0-9a-fA-F-]{20,}$/.test(s);
}

function passMinOk(pw: string): boolean {
  return String(pw || "").length >= 10;
}

export default function ResetPasswordScreen() {
  const nav = useNavigation<any>();

  // === state (equivalent to composable exports) ===
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // === derived (tokenOk, passOk, sameOk, canSubmit) ===
  const tokenOk = useMemo(() => {
    if (!token) return true; // Vue: aria-invalid only meaningful when filled
    return looksLikeToken(token);
  }, [token]);

  const passOk = useMemo(() => passMinOk(password), [password]);

  const sameOk = useMemo(() => {
    if (!confirm) return true; // same behavior: only show invalid once user typed
    return password === confirm;
  }, [password, confirm]);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!token || !looksLikeToken(token)) return false;
    if (!passMinOk(password)) return false;
    if (!confirm || password !== confirm) return false;
    return true;
  }, [busy, token, password, confirm]);

  // === actions (pasteToken, submit) ===
  const pasteToken = useCallback(async () => {
    try {
      const txt = await Clipboard.getString();
      const v = String(txt || "").trim();
      if (!v) return;
      setToken(v);
    } catch (e) {
      console.error("[ResetPasswordScreen] pasteToken failed:", e);
      await AlertService.error("Paste failed", e);
    }
  }, []);

  const submit = useCallback(async () => {
    if (!canSubmit) return;

    setBusy(true);
    try {
      const t = token.trim();
      const pw = password;
      const cf = confirm;

      const r = await AuthRecoveryService.resetPassword(t, pw, cf);

      if (r?.ok) {
        await AlertService.success("Password updated", "You can now sign in.");
        nav.replace("Login");
      } else {
        await AlertService.error(
          "Reset failed",
          r?.message || "Invalid request",
        );
      }
    } catch (e) {
      console.error("[ResetPasswordScreen] submit failed:", e);
      await AlertService.error("Reset failed", e);
    } finally {
      setBusy(false);
    }
  }, [canSubmit, token, password, confirm, nav]);

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      accessibilityLabel="Reset password page"
    >
      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.h1}>Reset password</Text>
          <Text style={styles.sub} accessibilityLabel={`${FORM_ID}__help`}>
            Provide the token (from invite/outbox) and set a new password.
          </Text>
        </View>

        <View style={styles.body} accessibilityLabel={FORM_ID}>
          {/* Token */}
          <View style={styles.field}>
            <Text style={styles.label}>Token</Text>

            <View style={styles.row}>
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="paste token here"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                style={[
                  styles.input,
                  busy && styles.inputDisabled,
                  token && !tokenOk && styles.inputInvalid,
                ]}
                accessibilityLabel="Token"
              />

              <Pressable
                onPress={() => void pasteToken()}
                disabled={busy}
                accessibilityLabel="Paste token"
                style={({ pressed }) => [
                  styles.btnGhost,
                  busy && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.btnText}>Paste</Text>
              </Pressable>
            </View>

            {token && !tokenOk ? (
              <Text style={styles.help}>Token format invalid.</Text>
            ) : null}
          </View>

          {/* New password */}
          <View style={styles.field}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="min 10 chars"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              style={[
                styles.input,
                busy && styles.inputDisabled,
                password && !passOk && styles.inputInvalid,
              ]}
              accessibilityLabel="New password"
            />
            {password && !passOk ? (
              <Text style={styles.help}>Minimum 10 characters.</Text>
            ) : null}
          </View>

          {/* Confirm password */}
          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="repeat password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              style={[
                styles.input,
                busy && styles.inputDisabled,
                confirm && !sameOk && styles.inputInvalid,
              ]}
              accessibilityLabel="Confirm password"
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
            {confirm && !sameOk ? (
              <Text style={styles.help}>Passwords do not match.</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => void submit()}
              disabled={!canSubmit}
              accessibilityLabel="Save"
              style={({ pressed }) => [
                styles.btnPrimary,
                !canSubmit && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              {busy ? (
                <View style={styles.busyInline}>
                  <ActivityIndicator />
                  <Text style={styles.btnText}>Saving…</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "100%",
    maxWidth: 720,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(20,20,24,0.95)",
    overflow: "hidden",
  },

  head: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(120,120,140,0.22)",
    gap: 4,
  },
  h1: { fontSize: 22, fontWeight: "800" },
  sub: { opacity: 0.7 },

  body: { padding: 14, gap: 14 },

  field: { gap: 6 },
  label: { fontWeight: "700" },

  row: { flexDirection: "row", gap: 10, alignItems: "center" },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabled: { opacity: 0.55 },
  inputInvalid: { borderColor: "rgba(220,80,80,0.55)" },

  help: { opacity: 0.7 },

  actions: { alignItems: "flex-end", paddingTop: 4 },

  btnText: { fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },

  btnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  busyInline: { flexDirection: "row", alignItems: "center", gap: 10 },
});
