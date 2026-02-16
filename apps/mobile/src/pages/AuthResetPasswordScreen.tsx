import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";

import AlertService from "../services/AlertService";
import AuthRecoveryService from "../services/AuthRecoveryService";
import PasswordPolicyService from "../services/PasswordPolicyService";

const FORM_ID = "auth_reset_password_form";
const PERSIST_KEY = `form.${FORM_ID}`;

// Basic rules matching your placeholder text.
// We still use PasswordPolicyService.ok(...) as the source of truth for canSubmit,
// but the checklist uses these heuristics for UX feedback.
function analyzePassword(pw: string, confirm: string) {
  const s = pw || "";
  return {
    minLen: s.length >= 10,
    hasUpper: /[A-Z]/.test(s),
    hasLower: /[a-z]/.test(s),
    hasNumber: /\d/.test(s),
    hasSymbol: /[^A-Za-z0-9]/.test(s),
    matches: !!s && s === (confirm || ""),
  };
}

type Persisted = { token?: string };

export default function AuthResetPasswordScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

  const [busy, setBusy] = useState(false);

  // Manual token input (only needed when no route token and no last token)
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const tokenFromRoute = useMemo(
    () => String(route.params?.token || ""),
    [route.params?.token],
  );
  const lastToken = useMemo(
    () => String(AuthRecoveryService.lastToken?.() || ""),
    [],
  );

  const requireManualToken = useMemo(
    () => !tokenFromRoute && !lastToken,
    [tokenFromRoute, lastToken],
  );

  const tokenEffective = useMemo(
    () => String(token || tokenFromRoute || lastToken || "").trim(),
    [token, tokenFromRoute, lastToken],
  );

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!email) return false;
    return PasswordPolicyService.ok(password, confirm);
  }, [busy, email, password, confirm]);

  const checklist = useMemo(
    () => analyzePassword(password, confirm),
    [password, confirm],
  );

  const persistToken = useCallback(async (value: string) => {
    try {
      const next: Persisted = { token: value };
      await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("[AuthResetPasswordScreen] persistToken failed:", e);
    }
  }, []);

  const loadPersistedToken = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PERSIST_KEY);
      if (!raw) return "";
      const parsed = JSON.parse(raw) as any;
      return typeof parsed?.token === "string" ? parsed.token : "";
    } catch (e) {
      console.error("[AuthResetPasswordScreen] loadPersistedToken failed:", e);
      return "";
    }
  }, []);

  const validateToken = useCallback(
    async (
      tok: string,
      { showMissingError }: { showMissingError: boolean },
    ) => {
      try {
        const t = String(tok || "").trim();

        if (!t) {
          setEmail("");
          if (showMissingError) {
            console.warn(
              "[AuthResetPasswordScreen] validateToken: no token available",
            );
            await AlertService.error(
              "Token inválido ou expirado",
              "Nenhum token informado",
            );
          }
          return;
        }

        AuthRecoveryService.setLastToken?.(t);

        const r = await AuthRecoveryService.validateToken(t);
        const resolvedEmail = r?.ok ? String(r.email || "") : "";
        setEmail(resolvedEmail);

        if (!r?.ok) {
          await AlertService.error("Token inválido ou expirado");
        }
      } catch (e) {
        console.error("[AuthResetPasswordScreen] validateToken failed:", e);
        await AlertService.error("Falha ao validar token", e);
      }
    },
    [],
  );

  const submit = useCallback(async () => {
    if (busy || !canSubmit) return;

    setBusy(true);
    try {
      const t = String(tokenEffective || "").trim();
      if (!t) {
        await AlertService.error(
          "Falha na redefinição",
          "Nenhum token informado",
        );
        return;
      }

      if (!password?.trim() || !confirm?.trim()) {
        await AlertService.error(
          "Falha na redefinição",
          "Os campos de senha são obrigatórios",
        );
        return;
      }

      const r = await AuthRecoveryService.resetPassword(t, password, confirm);

      if (r?.ok) {
        await AlertService.success(
          "Senha atualizada",
          "Agora você pode entrar com sua nova senha.",
        );
        nav.replace("Login");
      } else {
        await AlertService.error(
          "Falha na redefinição",
          r?.message || "Solicitação inválida",
        );
      }
    } catch (e) {
      console.error("[AuthResetPasswordScreen] submit failed:", e);
      await AlertService.error("Falha na redefinição", e);
    } finally {
      setBusy(false);
    }
  }, [busy, canSubmit, confirm, nav, password, tokenEffective]);

  // Mount: restore token if manual token is required, then validate.
  useEffect(() => {
    (async () => {
      try {
        if (requireManualToken && !token) {
          const savedTok = await loadPersistedToken();
          if (savedTok) {
            setToken(savedTok);
          }
        }

        await validateToken(tokenEffective, { showMissingError: true });
      } catch (e) {
        console.error("[AuthResetPasswordScreen] mount failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch tokenEffective changes (route token changes or token input changes)
  const firstWatch = useRef(true);
  useEffect(() => {
    (async () => {
      try {
        // Avoid double-firing initial alerts (mount already validated with showMissingError=true)
        const showMissingError = firstWatch.current ? false : false;
        firstWatch.current = false;

        if (!tokenEffective) {
          setEmail("");
          return;
        }
        await validateToken(tokenEffective, { showMissingError });
      } catch (e) {
        console.error("[AuthResetPasswordScreen] token watch failed:", e);
      }
    })();
  }, [tokenEffective, validateToken]);

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card} accessibilityLabel="Redefinir senha">
        <View style={styles.cardHead}>
          <Text style={styles.title}>Redefinir senha</Text>
        </View>

        <View
          style={styles.form}
          accessibilityLabel="Formulário de redefinição de senha"
        >
          <Text style={styles.helper} accessibilityLiveRegion="polite">
            {email ? (
              <>
                Para: <Text style={styles.bold}>{email}</Text>
              </>
            ) : (
              "Informe um token válido para redefinir sua senha."
            )}
          </Text>

          {/* Token input: only shown if no token came from route or lastToken */}
          {requireManualToken ? (
            <View style={styles.field}>
              <Text style={styles.label}>Token</Text>
              <TextInput
                value={token}
                onChangeText={(v) => {
                  setToken(v);
                  void persistToken(v);
                }}
                placeholder="Cole o token aqui"
                accessibilityLabel="Token de redefinição"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                style={[styles.input, busy && styles.inputDisabled]}
                returnKeyType="done"
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Nova senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo de 10 caracteres com maiúscula/minúscula/número/símbolo"
              accessibilityLabel="Nova senha"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              editable={!busy}
              style={[styles.input, busy && styles.inputDisabled]}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirme a senha"
              accessibilityLabel="Confirmar senha"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              editable={!busy}
              style={[styles.input, busy && styles.inputDisabled]}
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
            />
          </View>

          {/* PasswordChecklist.vue replacement */}
          <View
            style={styles.checklist}
            accessibilityLabel="Checklist de senha"
          >
            <ChecklistRow
              label="Pelo menos 10 caracteres"
              ok={checklist.minLen}
            />
            <ChecklistRow label="Letra maiúscula" ok={checklist.hasUpper} />
            <ChecklistRow label="Letra minúscula" ok={checklist.hasLower} />
            <ChecklistRow label="Número" ok={checklist.hasNumber} />
            <ChecklistRow label="Símbolo" ok={checklist.hasSymbol} />
            <ChecklistRow label="Senhas conferem" ok={checklist.matches} />
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => nav.replace("Login")}
              accessibilityLabel="Voltar para login"
              disabled={busy}
              style={({ pressed }) => [
                styles.btnGhost,
                busy && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.btnText}>Voltar</Text>
            </Pressable>

            <Pressable
              onPress={() => void submit()}
              accessibilityLabel="Salvar senha"
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.btnPrimary,
                !canSubmit && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              {busy ? (
                <View style={styles.busyInline}>
                  <ActivityIndicator />
                  <Text style={styles.btnText}>Salvando…</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Salvar senha</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.links}>
            <Pressable
              onPress={() => nav.navigate("ForgotPassword")}
              accessibilityLabel="Solicitar novo link de redefinição"
              disabled={busy}
            >
              <Text style={[styles.link, busy && styles.btnDisabled]}>
                Solicitar novo link de redefinição
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChecklistRow(props: { label: string; ok: boolean }) {
  const { label, ok } = props;
  return (
    <View style={styles.row}>
      <Text style={[styles.rowState, ok ? styles.ok : styles.no]}>
        {ok ? "OK" : "NO"}
      </Text>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, justifyContent: "center" },

  card: {
    width: "100%",
    maxWidth: 620,
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
  helper: { opacity: 0.8 },
  bold: { fontWeight: "800" },

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

  checklist: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowState: {
    width: 34,
    textAlign: "center",
    fontWeight: "800",
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  ok: { backgroundColor: "rgba(80,160,120,0.25)" },
  no: { backgroundColor: "rgba(220,80,80,0.25)" },
  rowLabel: { opacity: 0.9 },

  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
  },

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
  btnText: { fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  busyInline: { flexDirection: "row", alignItems: "center", gap: 10 },

  links: { alignItems: "center", paddingTop: 4 },
  link: { fontWeight: "700", textDecorationLine: "underline", opacity: 0.9 },
});
