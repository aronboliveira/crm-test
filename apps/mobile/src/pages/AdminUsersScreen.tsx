import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
// Optional (only if installed)
// import Clipboard from "@react-native-clipboard/clipboard";

import PolicyService from "../services/PolicyService";
import AlertService from "../services/AlertService";
import AdminApiService from "../services/AdminApiService";
import type { AdminUserRow } from "../types/admin.types";
import type { ResetResponse } from "../types/auth.types";

const KEY = "admin.users.state";

type State = {
  q: string;
  roleKey: string;
  cursor: string | null;
  limit: number;
};

const DEFAULT_STATE: State = {
  q: "",
  roleKey: "",
  cursor: null,
  limit: 50,
};

type RoleKey = "viewer" | "member" | "manager" | "admin";

function mergeState(raw: unknown): State {
  const o = (
    raw && typeof raw === "object" ? (raw as any) : {}
  ) as Partial<State>;
  return {
    q: typeof o.q === "string" ? o.q : DEFAULT_STATE.q,
    roleKey: typeof o.roleKey === "string" ? o.roleKey : DEFAULT_STATE.roleKey,
    cursor:
      typeof o.cursor === "string" || o.cursor === null
        ? o.cursor
        : DEFAULT_STATE.cursor,
    limit: typeof o.limit === "number" ? o.limit : DEFAULT_STATE.limit,
  };
}

/**
 * Minimal RN replacement for:
 * - AdminUserDetailsDrawer.vue
 * - CreateUserModal.vue
 *
 * Replace with your actual screens/components when ready.
 */
function AdminUserDetailsDrawerRN(props: {
  open: boolean;
  userId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { open, userId, onClose, onUpdated } = props;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.drawerPanel}
        >
          <View style={styles.modalHead}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.h2}>Detalhes do usuário</Text>
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                userId: {userId || "-"}
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.btnGhost}>
              <Text style={styles.btnText}>Fechar</Text>
            </Pressable>
          </View>

          <View style={{ padding: 14, gap: 10 }}>
            <Text style={{ opacity: 0.8 }}>
              Componente temporário. Substitua pelo seu drawer real (buscar
              detalhes do usuário etc.).
            </Text>

            <Pressable
              onPress={onUpdated}
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.btnText}>Recarregar lista</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CreateUserModalRN(props: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { open, onClose, onCreated } = props;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.panel}>
          <View style={styles.modalHead}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.h2}>Criar usuário</Text>
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                Modal temporário. Integre aqui com sua API de criação de
                usuário.
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.btnGhost}>
              <Text style={styles.btnText}>Fechar</Text>
            </Pressable>
          </View>

          <View style={{ padding: 14, gap: 10 }}>
            <Text style={{ opacity: 0.8 }}>
              Implemente seu formulário + chamada de API e depois chame
              onCreated().
            </Text>

            <Pressable
              onPress={() => {
                onClose();
                onCreated();
              }}
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.btnText}>Simular criação</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TokenModal(props: {
  open: boolean;
  token: string | null;
  onClose: () => void;
  // onCopy?: () => void;
}) {
  const { open, token, onClose } = props;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [anim, open]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.panel,
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
                <Text style={styles.h2}>Token de redefinição (dev)</Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  Use este token para montar uma URL de redefinição em dev.
                </Text>
              </View>

              <Pressable onPress={onClose} style={styles.btnGhost}>
                <Text style={styles.btnText}>Fechar</Text>
              </Pressable>
            </View>

            <View style={{ padding: 14, gap: 12 }}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{token || "-"}</Text>
              </View>

              {/* Optional copy support:
              <Pressable
                onPress={() => {
                  if (token) Clipboard.setString(token);
                }}
                style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}
              >
                <Text style={styles.btnText}>Copy</Text>
              </Pressable>
              */}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export default function AdminUsersScreen() {
  const can = useMemo(() => PolicyService.can("users.manage"), []);

  const [createOpen, setCreateOpen] = useState(false);
  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  const [st, setSt] = useState<State>(DEFAULT_STATE);
  const stRef = useRef<State>(st);
  useEffect(() => {
    stRef.current = st;
  }, [st]);

  const [rows, setRows] = useState<readonly AdminUserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);

  const openDrawer = useCallback((u: AdminUserRow) => {
    setDrawerUserId(String((u as any).id || ""));
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Role modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);
  const [roleValue, setRoleValue] = useState<RoleKey>("viewer");
  const [actionBusy, setActionBusy] = useState(false);

  // Force reset token modal state
  const [tokenOpen, setTokenOpen] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const saveState = useCallback(async (s: State) => {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      console.error("[AdminUsersScreen] saveState failed:", e);
    }
  }, []);

  const loadState = useCallback(async (): Promise<State> => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return DEFAULT_STATE;
      return mergeState(JSON.parse(raw));
    } catch (e) {
      console.error("[AdminUsersScreen] loadState failed:", e);
      return DEFAULT_STATE;
    }
  }, []);

  const load = useCallback(
    async (reset: boolean) => {
      if (!can || busyRef.current) return;

      setBusy(true);
      try {
        if (typeof reset !== "boolean") {
          console.warn(
            "[AdminUsersScreen] load: reset must be boolean, got:",
            typeof reset,
          );
          reset = false;
        }

        const cur = stRef.current;
        const effectiveState: State = reset
          ? { ...cur, cursor: null }
          : { ...cur };

        if (reset) {
          setRows([]);
          setNextCursor(null);
          setSt(effectiveState);
          stRef.current = effectiveState;
        }

        const query: {
          q?: string;
          roleKey?: string;
          cursor?: string;
          limit?: number;
        } = {
          limit: effectiveState.limit,
        };

        const q = effectiveState.q.trim();
        const roleKey = effectiveState.roleKey.trim();
        const cursor = effectiveState.cursor || "";

        if (q) query.q = q;
        if (roleKey) query.roleKey = roleKey;
        if (cursor) query.cursor = cursor;

        const r = await AdminApiService.usersList(query);

        const newCursor = r?.nextCursor || null;

        setRows((prev) => (reset ? r.items : [...prev, ...r.items]));
        setNextCursor(newCursor);

        const newState: State = { ...effectiveState, cursor: newCursor };
        setSt(newState);
        stRef.current = newState;

        await saveState(newState);
      } catch (e) {
        console.error("[AdminUsersScreen] load failed:", e);
        await AlertService.error("Falha ao carregar usuários", e);
      } finally {
        setBusy(false);
      }
    },
    [can, saveState],
  );

  const setRole = useCallback(
    async (u: AdminUserRow) => {
      if (!can) return;

      try {
        const id = String((u as any)?.id || "");
        if (!id) {
          console.error("[AdminUsersScreen] setRole: invalid user object");
          return;
        }

        const initial =
          (String((u as any).roleKey || "viewer") as RoleKey) || "viewer";
        setRoleTarget(u);
        setRoleValue(initial);
        setRoleModalOpen(true);
      } catch (e) {
        console.error("[AdminUsersScreen] setRole open failed:", e);
      }
    },
    [can],
  );

  const applyRole = useCallback(async () => {
    if (!can) return;
    const u = roleTarget;
    const id = String((u as any)?.id || "");
    if (!id) return;

    setActionBusy(true);
    try {
      await AdminApiService.userSetRole(id, String(roleValue || "viewer"));
      setRoleModalOpen(false);
      await AlertService.success("Perfil atualizado");
      await load(true);
    } catch (e) {
      console.error("[AdminUsersScreen] setRole failed:", e);
      await AlertService.error("Falha ao atualizar perfil", e);
    } finally {
      setActionBusy(false);
    }
  }, [can, load, roleTarget, roleValue]);

  const forceReset = useCallback(
    async (u: AdminUserRow) => {
      if (!can) return;

      const id = String((u as any)?.id || "");
      const email = String((u as any)?.email || "");
      if (!id) {
        console.error("[AdminUsersScreen] forceReset: invalid user object");
        return;
      }

      Alert.alert(
        "Forçar redefinição de senha?",
        `Isso irá invalidar as sessões de "${email}".`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Forçar redefinição",
            style: "destructive",
            onPress: async () => {
              setActionBusy(true);
              try {
                const r: ResetResponse =
                  await AdminApiService.userForceReset(id);

                const tok = r?.devResetToken ? String(r.devResetToken) : "";
                if (tok) {
                  setDevResetToken(tok);
                  setTokenOpen(true);
                } else {
                  await AlertService.success(
                    "Redefinição forçada aplicada",
                    "Em produção, deve ser usado envio por e-mail.",
                  );
                }

                await load(true);
              } catch (e) {
                console.error("[AdminUsersScreen] forceReset failed:", e);
                await AlertService.error("Falha ao forçar redefinição", e);
              } finally {
                setActionBusy(false);
              }
            },
          },
        ],
        { cancelable: true },
      );
    },
    [can, load],
  );

  useEffect(() => {
    (async () => {
      try {
        const saved = await loadState();
        setSt(saved);
        stRef.current = saved;
        await load(true);
      } catch (e) {
        console.error("[AdminUsersScreen] mount failed:", e);
      }
    })();
  }, [load, loadState]);

  if (!can) {
    return (
      <View style={styles.denied} accessibilityLabel="Acesso negado">
        <Text style={styles.deniedText}>Acesso negado.</Text>
      </View>
    );
  }

  const roleOptions: RoleKey[] = ["viewer", "member", "manager", "admin"];

  return (
    <View style={styles.root} accessibilityLabel="Usuários administrativos">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.h1}>Usuários</Text>
          <Text style={styles.subtitle}>
            Gestão de usuários apenas para administradores.
          </Text>
        </View>

        <View style={styles.filters}>
          <View style={styles.filterRow}>
            <View style={styles.field}>
              <Text style={styles.label}>Busca</Text>
              <TextInput
                value={st.q}
                onChangeText={(v) => setSt((p) => ({ ...p, q: v }))}
                placeholder="e-mail contém..."
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Buscar por e-mail"
                style={styles.input}
                returnKeyType="search"
                onSubmitEditing={() => void load(true)}
              />
            </View>

            <View style={[styles.field, styles.fieldRight]}>
              <Text style={styles.label}>Perfil</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={st.roleKey}
                  onValueChange={(v) => {
                    const newState: State = {
                      ...stRef.current,
                      roleKey: String(v),
                      cursor: null,
                    };
                    setSt(newState);
                    stRef.current = newState;
                    void load(true);
                  }}
                  accessibilityLabel="Filtro por perfil"
                >
                  <Picker.Item label="todos" value="" />
                  {roleOptions.map((r) => (
                    <Picker.Item key={r} label={r} value={r} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => void load(true)}
              disabled={busy}
              accessibilityLabel="Atualizar"
              style={({ pressed }) => [
                styles.btnGhost,
                busy && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.btnText}>Atualizar</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Table-like card */}
      <View
        style={styles.card}
        accessibilityLabel="Tabela de usuários"
        role="region"
      >
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator />
            <Text style={styles.busyText}>Carregando…</Text>
          </View>
        ) : null}

        <ScrollView horizontal contentContainerStyle={styles.tableMinWidth}>
          <View style={styles.table}>
            <View style={[styles.tr, styles.thRow]}>
              <Text style={[styles.th, styles.colEmail]}>Email</Text>
              <Text style={[styles.th, styles.colRole]}>Perfil</Text>
              <Text style={[styles.th, styles.colTok]}>Token v</Text>
              <Text style={[styles.th, styles.colPwd]}>Senha atualizada</Text>
              <Text style={[styles.th, styles.colCreated]}>Criado em</Text>
              <Text style={[styles.th, styles.colActions]}>Ações</Text>
              <Text style={[styles.th, styles.colLocked]}>Bloqueado</Text>
            </View>

            <FlatList
              data={rows as AdminUserRow[]}
              keyExtractor={(u) => String((u as any).id)}
              nestedScrollEnabled
              renderItem={({ item: u }) => {
                const email = String((u as any).email || "-");
                const roleKey = String((u as any).roleKey || "-");
                const tokenVersion = String((u as any).tokenVersion ?? "-");
                const pwdUpdated = String((u as any).passwordUpdatedAt || "-");
                const created = String((u as any).createdAt || "-");
                const locked = (u as any).lockedAt ? "sim" : "não";

                return (
                  <View style={[styles.tr, styles.tdRow]}>
                    <View style={[styles.td, styles.colEmail]}>
                      <Pressable
                        onPress={() => openDrawer(u)}
                        style={({ pressed }) => [
                          styles.btnGhostSm,
                          pressed && styles.btnPressed,
                        ]}
                        accessibilityLabel="Abrir detalhes do usuário"
                        disabled={actionBusy}
                      >
                        <Text
                          style={[styles.btnText, styles.bold]}
                          numberOfLines={1}
                        >
                          {email}
                        </Text>
                      </Pressable>
                    </View>

                    <Text style={[styles.td, styles.colRole]} numberOfLines={1}>
                      {roleKey}
                    </Text>

                    <Text style={[styles.td, styles.colTok]} numberOfLines={1}>
                      {tokenVersion}
                    </Text>

                    <Text style={[styles.td, styles.colPwd]} numberOfLines={1}>
                      {pwdUpdated}
                    </Text>

                    <Text
                      style={[styles.td, styles.colCreated]}
                      numberOfLines={1}
                    >
                      {created}
                    </Text>

                    <View style={[styles.td, styles.colActions]}>
                      <View style={styles.actionsRow}>
                        <Pressable
                          onPress={() => void setRole(u)}
                          style={({ pressed }) => [
                            styles.btnGhostSm,
                            pressed && styles.btnPressed,
                          ]}
                          accessibilityLabel="Alterar perfil"
                          disabled={actionBusy}
                        >
                          <Text style={styles.btnText}>Perfil</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => void forceReset(u)}
                          style={({ pressed }) => [
                            styles.btnGhostSm,
                            pressed && styles.btnPressed,
                          ]}
                          accessibilityLabel="Forçar redefinição"
                          disabled={actionBusy}
                        >
                          <Text style={styles.btnText}>Forçar redefinição</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => openDrawer(u)}
                          style={({ pressed }) => [
                            styles.btnGhostSm,
                            pressed && styles.btnPressed,
                          ]}
                          accessibilityLabel="Ver usuário"
                          disabled={actionBusy}
                        >
                          <Text style={styles.btnText}>Ver</Text>
                        </Pressable>
                      </View>
                    </View>

                    <Text
                      style={[styles.td, styles.colLocked]}
                      numberOfLines={1}
                    >
                      {locked}
                    </Text>
                  </View>
                );
              }}
              ListEmptyComponent={
                !rows.length && !busy ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>Nenhum usuário.</Text>
                  </View>
                ) : null
              }
            />
          </View>
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={() => void load(false)}
          disabled={busy || !nextCursor}
          accessibilityLabel="Carregar mais"
          style={({ pressed }) => [
            styles.btnPrimary,
            (busy || !nextCursor) && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>Carregar mais</Text>
        </Pressable>

        <Pressable
          onPress={openCreate}
          disabled={busy}
          accessibilityLabel="Criar usuário"
          style={({ pressed }) => [
            styles.btnPrimary,
            busy && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>Criar usuário</Text>
        </Pressable>
      </View>

      {/* Role Picker Modal (SweetAlert2 replacement) */}
      <Modal
        visible={roleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setRoleModalOpen(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.panel}>
            <View style={styles.modalHead}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.h2}>Alterar perfil</Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  {String((roleTarget as any)?.email || "")}
                </Text>
              </View>

              <Pressable
                onPress={() => setRoleModalOpen(false)}
                style={styles.btnGhost}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </Pressable>
            </View>

            <View style={{ padding: 14, gap: 12 }}>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={roleValue}
                  onValueChange={(v) => setRoleValue(String(v) as RoleKey)}
                >
                  {roleOptions.map((r) => (
                    <Picker.Item key={r} label={r} value={r} />
                  ))}
                </Picker>
              </View>

              <Pressable
                onPress={() => void applyRole()}
                disabled={actionBusy}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  actionBusy && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.btnText}>Aplicar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Dev reset token modal */}
      <TokenModal
        open={tokenOpen}
        token={devResetToken}
        onClose={() => setTokenOpen(false)}
      />

      {/* Drawer + Create modal (stubs) */}
      <AdminUserDetailsDrawerRN
        open={drawerOpen}
        userId={drawerUserId}
        onClose={closeDrawer}
        onUpdated={() => void load(true)}
      />
      <CreateUserModalRN
        open={createOpen}
        onClose={closeCreate}
        onCreated={() => void load(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12 },

  header: { gap: 10 },
  titleWrap: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "800" },
  subtitle: { opacity: 0.7 },

  filters: { gap: 10 },
  filterRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  field: { flex: 1, gap: 6 },
  fieldRight: { flexBasis: 180, flexGrow: 0, flexShrink: 0 },
  label: { fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    overflow: "hidden",
  },
  actions: { flexDirection: "row", justifyContent: "flex-end" },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 12,
  },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
  },
  busyText: { opacity: 0.8 },

  tableMinWidth: { minWidth: 920 },
  table: { flex: 1 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  thRow: { opacity: 0.85 },
  tdRow: {},
  th: { paddingVertical: 10, paddingRight: 12, fontWeight: "700" },
  td: { paddingVertical: 10, paddingRight: 12 },

  colEmail: { width: 260 },
  colRole: { width: 110 },
  colTok: { width: 90 },
  colPwd: { width: 160 },
  colCreated: { width: 160 },
  colActions: { width: 340 },
  colLocked: { width: 80 },

  actionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  bold: { fontWeight: "700" },

  empty: { paddingVertical: 24, alignItems: "center" },
  emptyText: { opacity: 0.7 },

  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },

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
  btnGhostSm: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignSelf: "flex-start",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  panel: {
    width: "100%",
    maxWidth: 900,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(20,20,24,0.95)",
    overflow: "hidden",
  },
  drawerPanel: {
    width: "100%",
    maxWidth: 900,
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
  h2: { fontSize: 18, fontWeight: "800" },
  modalSubtitle: { opacity: 0.75 },

  codeBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.18)",
    padding: 12,
  },
  codeText: { fontFamily: "monospace", opacity: 0.9 },

  denied: { flex: 1, padding: 24, justifyContent: "center" },
  deniedText: { opacity: 0.7, textAlign: "center" },
});
