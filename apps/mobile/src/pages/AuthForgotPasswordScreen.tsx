import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Clipboard from "@react-native-clipboard/clipboard";
import { useNavigation } from "@react-navigation/native";

import AlertService from "../services/AlertService";
import AuthRecoveryService from "../services/AuthRecoveryService";
import { STORAGE_KEYS, NAV_ROUTES, validateEmail } from "../constants";

type RequestResetResult = {
  ok?: boolean;
  message?: string;
  devResetToken?: string;
};

const PERSIST_KEY = STORAGE_KEYS.FORM.FORGOT_PASSWORD;

/**
 * Validate email format
 * Uses centralized validation from constants
 */
function looksLikeEmail(v: string): boolean {
  return validateEmail(v).valid;
}

export default function AuthForgotPasswordScreen() {
  const nav = useNavigation<any>();

  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  // Dev-token modal state
  const [tokOpen, setTokOpen] = useState(false);
  const [tok, setTok] = useState<string | null>(null);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: tokOpen ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [anim, tokOpen]);

  const persistEmail = useCallback(async (value: string) => {
    try {
      await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify({ email: value }));
    } catch (e) {
      console.error("[AuthForgotPasswordScreen] persistEmail failed:", e);
    }
  }, []);

  const loadPersistedEmail = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PERSIST_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      return typeof parsed?.email === "string" ? parsed.email : null;
    } catch (e) {
      console.error("[AuthForgotPasswordScreen] loadPersistedEmail failed:", e);
      return null;
    }
  }, []);

  // Mount: restore email (service lastEmail preferred, then persisted form)
  useEffect(() => {
    (async () => {
      try {
        const last = AuthRecoveryService.lastEmail?.() || "";
        if (last) {
          setEmail(last);
          await persistEmail(last);
          return;
        }

        const persisted = await loadPersistedEmail();
        if (persisted) setEmail(persisted);
      } catch (e) {
        console.error("[AuthForgotPasswordScreen] mount failed:", e);
      }
    })();
  }, [loadPersistedEmail, persistEmail]);

  const closeToken = useCallback(() => {
    setTokOpen(false);
  }, []);

  const copyTokenAndClose = useCallback(async () => {
    try {
      const t = tok || "";
      if (!t) return;
      Clipboard.setString(t);
    } catch (e) {
      console.error("[AuthForgotPasswordScreen] clipboard copy failed:", e);
    } finally {
      closeToken();
    }
  }, [closeToken, tok]);

  const goToReset = useCallback(() => {
    const t = tok || "";
    // Navigate to reset password screen with token
    nav.replace(NAV_ROUTES.AUTH.RESET_PASSWORD, { token: t });
  }, [closeToken, nav, tok]);

  const submit = useCallback(async () => {
    if (busy) return;

    setBusy(true);
    try {
      const e = (email || "").trim();
      if (!e) {
        await AlertService.error(
          "Falha na solicitação",
          "E-mail é obrigatório",
        );
        return;
      }

      // Optional: keep parity with HTML email input feedback.
      if (!looksLikeEmail(e)) {
        await AlertService.error(
          "Falha na solicitação",
          "Informe um e-mail válido",
        );
        return;
      }

      // Keep service memory parity
      if (AuthRecoveryService.setLastEmail) {
        AuthRecoveryService.setLastEmail(e);
      }
      await persistEmail(e);

      const r: RequestResetResult = await AuthRecoveryService.requestReset(e);

      if (r?.devResetToken) {
        const token = String(r.devResetToken);
        AuthRecoveryService.setLastToken?.(token);

        setTok(token);
        setTokOpen(true);
        return;
      }

      if (r?.ok) {
        await AlertService.success(
          "Solicitação recebida",
          r.message ||
            "Se o e-mail existir, você receberá instruções para redefinição.",
        );
        nav.replace(NAV_ROUTES.AUTH.LOGIN);
      } else {
        await AlertService.error(
          "Falha na solicitação",
          r?.message || "Solicitação inválida",
        );
      }
    } catch (err) {
      console.error("[AuthForgotPasswordScreen] submit failed:", err);
      await AlertService.error("Falha na solicitação", err);
    } finally {
      setBusy(false);
    }
  }, [busy, email, nav, persistEmail]);

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card} accessibilityLabel={"Recuperação de senha"}>
        <View style={styles.cardHead}>
          <Text style={styles.title}>Esqueci minha senha</Text>
        </View>

        <View
          style={styles.form}
          accessibilityLabel={"Formulário de recuperação de senha"}
        >
          <Text style={styles.helper} accessibilityLiveRegion="polite">
            Informe seu e-mail. Se ele existir, você receberá instruções para
            redefinição.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                void persistEmail(v);
              }}
              placeholder="admin@corp.local"
              accessibilityLabel={"Email"}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              editable={!busy}
              style={[styles.input, busy && styles.inputDisabled]}
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => nav.replace(NAV_ROUTES.AUTH.LOGIN)}
              accessibilityLabel={"Voltar para login"}
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
              accessibilityLabel={"Enviar link de redefinição"}
              disabled={busy}
              style={({ pressed }) => [
                styles.btnPrimary,
                busy && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              {busy ? (
                <View style={styles.busyInline}>
                  <ActivityIndicator />
                  <Text style={styles.btnText}>Enviando…</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Enviar link de redefinição</Text>
              )}
            </Pressable>
          </View>

          {/* Equivalent of "Return to login" link */}
          <View style={styles.links}>
            <Pressable
              onPress={() => nav.replace(NAV_ROUTES.AUTH.LOGIN)}
              accessibilityLabel={"Ir para login"}
            >
              <Text style={styles.link}>Voltar para login</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Dev reset token modal (SweetAlert2 replacement) */}
      <Modal
        visible={tokOpen}
        transparent
        animationType="none"
        onRequestClose={closeToken}
      >
        <Pressable
          style={styles.overlay}
          onPress={closeToken}
          accessibilityLabel={"Token de redefinição (dev)"}
        >
          <Animated.View
            style={[
              styles.modalPanel,
              {
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHead}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.modalTitle}>Dev reset token</Text>
                  <Text style={styles.modalSub}>Token</Text>
                </View>

                <Pressable onPress={closeToken} style={styles.btnGhost}>
                  <Text style={styles.btnText}>Fechar</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{tok || "-"}</Text>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => void copyTokenAndClose()}
                    style={({ pressed }) => [
                      styles.btnPrimary,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityLabel={"Copiar"}
                  >
                    <Text style={styles.btnText}>Copiar</Text>
                  </Pressable>

                  <Pressable
                    onPress={goToReset}
                    style={({ pressed }) => [
                      styles.btnGhost,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityLabel={"Ir para redefinição"}
                  >
                    <Text style={styles.btnText}>Ir para redefinição</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 560,
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
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  form: {
    padding: 14,
    gap: 12,
  },
  helper: {
    opacity: 0.8,
  },
  field: {
    gap: 6,
  },
  label: {
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
  },
  links: {
    alignItems: "center",
    paddingTop: 4,
  },
  link: {
    fontWeight: "700",
    textDecorationLine: "underline",
    opacity: 0.9,
  },

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

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  modalPanel: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(20,20,24,0.95)",
    overflow: "hidden",
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(120,120,140,0.22)",
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalSub: { opacity: 0.75, fontSize: 12 },

  modalBody: { padding: 14, gap: 12 },
  codeBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.18)",
    padding: 12,
  },
  codeText: {
    fontFamily: "monospace",
    opacity: 0.9,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
});
