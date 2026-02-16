import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";

import PolicyService from "../services/PolicyService";
import AlertService from "../services/AlertService";
import AdminApiService from "../services/AdminApiService";
import type { AuditEventRow } from "../types/admin.types";

type AuditState = {
  q: string;
  kind: string;
  cursor: string | null;
  limit: number;
};

const KEY = "admin.audit.state";

const DEFAULT_STATE: AuditState = {
  q: "",
  kind: "",
  cursor: null,
  limit: 100,
};

function safeStringifyMeta(meta: unknown): string {
  try {
    return meta ? JSON.stringify(meta) : "-";
  } catch {
    return "[não serializável]";
  }
}

export default function AdminAuditScreen() {
  const can = useMemo(() => PolicyService.can("audit.read"), []);

  const [st, setSt] = useState<AuditState>(DEFAULT_STATE);
  const stRef = useRef<AuditState>(st);
  useEffect(() => {
    stRef.current = st;
  }, [st]);

  const [rows, setRows] = useState<readonly AuditEventRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const saveState = useCallback(async (stateToSave: AuditState) => {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(stateToSave));
    } catch (e) {
      // keep non-fatal
      console.error("[AdminAuditScreen] saveState failed:", e);
    }
  }, []);

  const loadState = useCallback(async (): Promise<AuditState> => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return DEFAULT_STATE;

      const parsed = JSON.parse(raw) as Partial<AuditState> | null;
      if (!parsed || typeof parsed !== "object") return DEFAULT_STATE;

      // defensive merging
      return {
        q: typeof parsed.q === "string" ? parsed.q : DEFAULT_STATE.q,
        kind:
          typeof parsed.kind === "string" ? parsed.kind : DEFAULT_STATE.kind,
        cursor:
          typeof parsed.cursor === "string" || parsed.cursor === null
            ? parsed.cursor
            : DEFAULT_STATE.cursor,
        limit:
          typeof parsed.limit === "number" ? parsed.limit : DEFAULT_STATE.limit,
      };
    } catch (e) {
      console.error("[AdminAuditScreen] loadState failed:", e);
      return DEFAULT_STATE;
    }
  }, []);

  const load = useCallback(
    async (reset: boolean) => {
      if (!can || busy) return;

      setBusy(true);
      try {
        if (typeof reset !== "boolean") {
          console.warn(
            "[AdminAuditScreen] load: reset must be boolean, got:",
            typeof reset,
          );
          reset = false;
        }

        const cur = stRef.current;

        const effectiveState: AuditState = reset
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
          kind?: string;
          cursor?: string;
          limit?: number;
        } = {
          limit: effectiveState.limit,
        };

        const q = effectiveState.q.trim();
        const kind = effectiveState.kind.trim();
        const cursor = effectiveState.cursor || "";

        if (q) query.q = q;
        if (kind) query.kind = kind;
        if (cursor) query.cursor = cursor;

        const r = await AdminApiService.auditList(query);

        const newCursor = r.nextCursor || null;

        setRows((prev) => (reset ? r.items : [...prev, ...r.items]));
        setNextCursor(newCursor);

        const newState: AuditState = { ...effectiveState, cursor: newCursor };
        setSt(newState);
        stRef.current = newState;

        await saveState(newState);
      } catch (e) {
        console.error("[AdminAuditScreen] load failed:", e);
        await AlertService.error("Falha ao carregar eventos de auditoria", e);
      } finally {
        setBusy(false);
      }
    },
    [busy, can, saveState],
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const saved = await loadState();
        if (!mounted) return;

        setSt(saved);
        stRef.current = saved;

        await load(true);
      } catch (e) {
        console.error("[AdminAuditScreen] mount failed:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [load, loadState]);

  if (!can) {
    return (
      <View style={styles.denied} accessibilityLabel="Acesso negado">
        <Text style={styles.deniedText}>Acesso negado.</Text>
      </View>
    );
  }

  const kinds = [
    "",
    "auth.login.success",
    "auth.login.failure",
    "auth.password_reset.requested",
    "auth.password_reset.completed",
    "admin.user.role_changed",
    "admin.user.force_reset",
    "admin.user.locked",
    "admin.user.unlocked",
  ];

  return (
    <View style={styles.root} accessibilityLabel="Auditoria administrativa">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.h1}>Auditoria</Text>
          <Text style={styles.subtitle}>
            Eventos de autenticação e administração.
          </Text>
        </View>

        <View style={styles.filters}>
          <View style={styles.filterRow}>
            <View style={styles.field}>
              <Text style={styles.label}>Busca</Text>
              <TextInput
                value={st.q}
                onChangeText={(v) => setSt((p) => ({ ...p, q: v }))}
                placeholder="digite e-mail completo (exato) ou fragmento mascarado (ex.: ad***@c***)"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Buscar por e-mail"
                style={styles.input}
                returnKeyType="search"
                onSubmitEditing={() => void load(true)}
              />
            </View>

            <View style={[styles.field, styles.fieldRight]}>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={st.kind}
                  onValueChange={(v) => {
                    setSt((p) => ({ ...p, kind: String(v) }));
                    void load(true);
                  }}
                  accessibilityLabel="Filtro por tipo"
                >
                  {kinds.map((k) => (
                    <Picker.Item
                      key={k || "all"}
                      label={k || "todos"}
                      value={k}
                    />
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

      {/* List (table-like) */}
      <View
        style={styles.card}
        accessibilityLabel="Tabela de auditoria"
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
            {/* Header row */}
            <View style={[styles.tr, styles.thRow]}>
              <Text style={[styles.th, styles.colAt]}>Em</Text>
              <Text style={[styles.th, styles.colKind]}>Tipo</Text>
              <Text style={[styles.th, styles.colActor]}>Ator</Text>
              <Text style={[styles.th, styles.colTarget]}>Alvo</Text>
              <Text style={[styles.th, styles.colMeta]}>Meta</Text>
            </View>

            <FlatList
              data={rows as AuditEventRow[]}
              keyExtractor={(e) =>
                String((e as any)._id ?? `${e.createdAt}-${e.kind}`)
              }
              renderItem={({ item }) => {
                const actor =
                  (item as any).actorEmailMasked || item.actorEmail || "-";
                const target =
                  (item as any).targetEmailMasked || item.targetEmail || "-";
                const meta = safeStringifyMeta(item.meta);

                return (
                  <View style={[styles.tr, styles.tdRow]}>
                    <Text style={[styles.td, styles.colAt]} numberOfLines={1}>
                      {String(item.createdAt ?? "-")}
                    </Text>
                    <Text
                      style={[styles.td, styles.colKind, styles.kind]}
                      numberOfLines={1}
                    >
                      {String(item.kind ?? "-")}
                    </Text>
                    <Text
                      style={[styles.td, styles.colActor]}
                      numberOfLines={1}
                    >
                      {String(actor)}
                    </Text>
                    <Text
                      style={[styles.td, styles.colTarget]}
                      numberOfLines={1}
                    >
                      {String(target)}
                    </Text>
                    <Text style={[styles.td, styles.colMeta, styles.code]}>
                      {meta}
                    </Text>
                  </View>
                );
              }}
              ListEmptyComponent={
                !busy ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>Nenhum evento.</Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 10,
  },
  titleWrap: {
    gap: 4,
  },
  h1: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    opacity: 0.7,
  },
  filters: {
    gap: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  field: {
    flex: 1,
    gap: 6,
  },
  fieldRight: {
    flexBasis: 300,
    flexGrow: 0,
    flexShrink: 0,
  },
  label: {
    fontWeight: "600",
  },
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
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
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
  busyText: {
    opacity: 0.8,
  },

  tableMinWidth: {
    minWidth: 1060,
  },
  table: {
    flex: 1,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  thRow: {
    opacity: 0.85,
  },
  tdRow: {},
  th: {
    paddingVertical: 10,
    paddingRight: 12,
    fontWeight: "700",
  },
  td: {
    paddingVertical: 10,
    paddingRight: 12,
  },

  colAt: { width: 160 },
  colKind: { width: 260 },
  colActor: { width: 220 },
  colTarget: { width: 220 },
  colMeta: { width: 520 },

  kind: {
    fontWeight: "700",
  },
  code: {
    opacity: 0.85,
    // Use monospace if available; RN will fallback if unsupported
    fontFamily: "monospace",
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.7,
  },
  footer: {
    alignItems: "flex-end",
  },
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnText: {
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPressed: {
    opacity: 0.85,
  },
  denied: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  deniedText: {
    opacity: 0.7,
    textAlign: "center",
  },
});
