import React, { useMemo, useRef, useState } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";

import AuthService from "../services/AuthService";
import AlertService from "../services/AlertService";
import { NAV_ROUTES } from "../constants";

type RouteParams = {
  token?: string;
  email?: string;
  next?: string;
};

export default function Auth2FAScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

  const params = (route?.params || {}) as RouteParams;
  const twoFactorToken = String(params.token || "").trim();
  const email = String(params.email || "").trim();

  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const codeRef = useRef<TextInput | null>(null);

  const inputLabel = useMemo(
    () => (isRecoveryMode ? "Código de recuperação" : "Código 2FA"),
    [isRecoveryMode],
  );

  const submit = async () => {
    if (busy) return;

    setBusy(true);
    try {
      if (!twoFactorToken) {
        await AlertService.error(
          "Sessão inválida",
          "Token 2FA ausente. Faça login novamente.",
        );
        nav.replace(NAV_ROUTES.AUTH.LOGIN);
        return;
      }

      const normalizedCode = String(code || "").trim();
      if (!normalizedCode) {
        await AlertService.error("Validação", "Informe seu código 2FA");
        return;
      }

      await AuthService.verifyTwoFactor(twoFactorToken, normalizedCode);

      await AlertService.success("Autenticado", "Login concluído com sucesso");
      nav.replace(NAV_ROUTES.DASHBOARD.HOME);
    } catch (error) {
      await AlertService.error("Falha na verificação", error);
      setCode("");
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const toggleRecoveryMode = () => {
    setIsRecoveryMode((v) => !v);
    setCode("");
    setTimeout(() => codeRef.current?.focus(), 0);
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={styles.card}
        accessibilityLabel="Autenticação de dois fatores"
      >
        <View style={styles.cardHead}>
          <Text style={styles.title}>Verificação em duas etapas</Text>
        </View>

        <View style={styles.form}>
          {email ? (
            <Text style={styles.subtitle}>Verificando acesso para {email}</Text>
          ) : null}
          <Text style={styles.description}>
            Informe o código do seu app autenticador. Você também pode usar um
            código de recuperação.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>{inputLabel}</Text>
            <TextInput
              ref={(r) => (codeRef.current = r)}
              value={code}
              onChangeText={setCode}
              autoCapitalize={isRecoveryMode ? "characters" : "none"}
              autoCorrect={false}
              keyboardType={isRecoveryMode ? "default" : "number-pad"}
              maxLength={isRecoveryMode ? 32 : 6}
              editable={!busy}
              placeholder={isRecoveryMode ? "RECUPERACAO-XXXX" : "000000"}
              accessibilityLabel={inputLabel}
              style={[
                styles.input,
                styles.codeInput,
                busy && styles.inputDisabled,
              ]}
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
            />
          </View>

          <Pressable
            onPress={toggleRecoveryMode}
            disabled={busy}
            accessibilityLabel={
              isRecoveryMode
                ? "Usar código do autenticador"
                : "Usar código de recuperação"
            }
            style={({ pressed }) => [
              styles.toggle,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.toggleText}>
              {isRecoveryMode
                ? "Usar código do app"
                : "Usar código de recuperação"}
            </Text>
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              onPress={() => nav.replace(NAV_ROUTES.AUTH.LOGIN)}
              disabled={busy}
              accessibilityLabel="Voltar para login"
              style={({ pressed }) => [
                styles.btnGhost,
                busy && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.btnGhostText}>Voltar</Text>
            </Pressable>

            <Pressable
              onPress={() => void submit()}
              disabled={busy}
              accessibilityLabel="Verificar código 2FA"
              style={({ pressed }) => [
                styles.btnPrimary,
                busy && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              {busy ? (
                <View style={styles.busyInline}>
                  <ActivityIndicator />
                  <Text style={styles.btnText}>Verificando…</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Verificar</Text>
              )}
            </Pressable>
          </View>
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
  subtitle: { opacity: 0.85 },
  description: { opacity: 0.75, lineHeight: 18 },
  field: { gap: 6 },
  label: { fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 18,
    letterSpacing: 2,
    fontWeight: "700",
  },
  inputDisabled: { opacity: 0.55 },
  toggle: { alignSelf: "flex-start" },
  toggleText: {
    textDecorationLine: "underline",
    fontWeight: "700",
    opacity: 0.9,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  btnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: { fontWeight: "700" },
  btnGhostText: { fontWeight: "700", opacity: 0.9 },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  busyInline: { flexDirection: "row", alignItems: "center", gap: 10 },
});
