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
import OAuthService from "../services/OAuthService";
import { NAV_ROUTES } from "../constants";
import type {
  OAuthProvider,
  OAuthProviderAvailability,
  LoginResult,
} from "../types/auth.types";

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
  const [oauthBusyProvider, setOauthBusyProvider] =
    useState<OAuthProvider | null>(null);
  const [oauthProviders, setOauthProviders] = useState<
    OAuthProviderAvailability[]
  >([]);
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
        await AlertService.error("Falha no login", "E-mail é obrigatório");
        return;
      }
      if (!looksLikeEmail(e)) {
        await AlertService.error("Falha no login", "Informe um e-mail válido");
        return;
      }
      if (!p) {
        await AlertService.error("Falha no login", "Senha é obrigatória");
        return;
      }

      const result = (await AuthService.login(e, p)) as LoginResult;

      if ((result as any)?.requiresTwoFactor) {
        const twoFactorToken = (result as any).twoFactorToken;
        nav.replace(NAV_ROUTES.AUTH.TWO_FACTOR, {
          token: twoFactorToken,
          email: (result as any).email || e,
        });
        return;
      }

      if (!AuthService.isAuthed()) {
        await AlertService.error("Falha no login", "Token não recebido");
        return;
      }

      // Optional: you may want to clear password persistence on success
      // await persist({ password: "" });

      nav.replace(NAV_ROUTES.DASHBOARD.HOME);
    } catch (err) {
      console.error("[AuthLoginScreen] submit failed:", err);
      await AlertService.error("Falha no login", err);
    } finally {
      setBusy(false);
    }
  }, [busy, email, password, nav]);

  const startOAuth = useCallback(
    async (provider: OAuthProvider) => {
      if (busy || oauthBusyProvider) return;

      const current = oauthProviders.find((item) => item.provider === provider);
      if (current && !current.enabled) {
        await AlertService.error(
          "SSO indisponível",
          current.reason || "Provedor não configurado",
        );
        return;
      }

      try {
        setOauthBusyProvider(provider);
        await OAuthService.initiateLogin(provider);
      } finally {
        setOauthBusyProvider(null);
      }
    },
    [busy, oauthBusyProvider, oauthProviders],
  );

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

        try {
          const availability = await OAuthService.getProviderAvailability();
          setOauthProviders(availability);
        } catch (error) {
          console.error(
            "[AuthLoginScreen] provider availability failed:",
            error,
          );
          setOauthProviders([
            { provider: "google", enabled: true },
            { provider: "microsoft", enabled: true },
            { provider: "nextcloud", enabled: true },
          ]);
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
      <View style={styles.card} accessibilityLabel="Autenticação">
        <View style={styles.cardHead}>
          <Text style={styles.title}>Entrar</Text>
        </View>

        <View style={styles.form} accessibilityLabel="Formulário de login">
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
            <Text style={styles.label}>Senha</Text>
            <TextInput
              ref={(r) => (passRef.current = r)}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                void persist({ password: v });
              }}
              placeholder="Admin#123"
              accessibilityLabel="Senha"
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
              accessibilityLabel="Entrar"
              accessibilityHint={
                // ! DEV ONLY
                "Usuários de teste: admin@corp.local / Admin#123, manager@corp.local / Manager#123, member@corp.local / Member#123, viewer@corp.local / Viewer#123"
              }
              style={({ pressed }) => [
                styles.btnPrimary,
                busy && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              {busy ? (
                <View style={styles.busyInline}>
                  <ActivityIndicator />
                  <Text style={styles.btnText}>Entrando…</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Entrar</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.links}>
            <Pressable
              onPress={() => nav.navigate("ForgotPassword")}
              accessibilityLabel="Esqueceu sua senha"
              disabled={busy}
            >
              <Text style={[styles.link, busy && styles.btnDisabled]}>
                Esqueceu sua senha?
              </Text>
            </Pressable>
          </View>

          <View style={styles.ssoDivider}>
            <View style={styles.ssoDividerLine} />
            <Text style={styles.ssoDividerText}>ou continue com</Text>
            <View style={styles.ssoDividerLine} />
          </View>

          <View
            style={styles.ssoButtons}
            accessible
            accessibilityLabel="Login com provedores externos"
          >
            {(
              [
                { provider: "google", label: "Google" },
                { provider: "microsoft", label: "Microsoft" },
                { provider: "nextcloud", label: "NextCloud" },
              ] as const
            ).map((item) => {
              const availability = oauthProviders.find(
                (p) => p.provider === item.provider,
              );
              const enabled = availability ? availability.enabled : true;
              const isBusy = oauthBusyProvider === item.provider;
              const disabled = busy || oauthBusyProvider !== null || !enabled;

              return (
                <Pressable
                  key={item.provider}
                  onPress={() => void startOAuth(item.provider)}
                  disabled={disabled}
                  accessibilityLabel={
                    enabled
                      ? `Entrar com ${item.label}`
                      : `${item.label} indisponível`
                  }
                  accessibilityHint={
                    enabled
                      ? `Abrir autenticação de ${item.label} no navegador`
                      : availability?.reason || "Provedor indisponível"
                  }
                  style={({ pressed }) => [
                    styles.ssoBtn,
                    isBusy && styles.ssoBtnActive,
                    !enabled && styles.ssoBtnDisabled,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text style={styles.ssoBtnText}>{item.label}</Text>
                  {isBusy ? (
                    <ActivityIndicator size="small" style={styles.ssoSpinner} />
                  ) : null}
                </Pressable>
              );
            })}
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

  ssoDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  ssoDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  ssoDividerText: { opacity: 0.75, fontSize: 12, fontWeight: "600" },
  ssoButtons: { gap: 8 },
  ssoBtn: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  ssoBtnActive: {
    borderColor: "rgba(66,133,244,0.9)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ssoBtnDisabled: { opacity: 0.55 },
  ssoBtnText: { fontWeight: "700" },
  ssoSpinner: { marginLeft: 4 },
});
