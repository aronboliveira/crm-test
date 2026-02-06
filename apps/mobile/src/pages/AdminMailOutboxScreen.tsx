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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import AdminApiService, {
  type MailOutboxItem,
} from "../services/AdminApiService";
import AlertService from "../services/AlertService";
import DateMapper from "../services/DateMapper";

type State = {
  q: string;
  kind: string;
  cursor: string;
  limit: number;
};

const DEFAULT_STATE: State = { q: "", kind: "", cursor: "", limit: 40 };

function safeJsonPretty(v: unknown): string {
  try {
    return v ? JSON.stringify(v, null, 2) : "-";
  } catch {
    return "[unserializable]";
  }
}

export default function AdminMailOutboxScreen() {
  const [st, setSt] = useState<State>(DEFAULT_STATE);
  const stRef = useRef<State>(st);
  useEffect(() => {
    stRef.current = st;
  }, [st]);

  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<MailOutboxItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [selected, setSelected] = useState<MailOutboxItem | null>(null);
  const [selectedOpen, setSelectedOpen] = useState(false);

  // modal animation
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: selectedOpen ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [anim, selectedOpen]);

  const load = useCallback(async (reset: boolean = false) => {
    setBusy(true);
    try {
      if (typeof reset !== "boolean") {
        console.warn(
          "[AdminMailOutboxScreen] load: reset must be boolean, got:",
          typeof reset,
        );
        reset = false;
      }

      const cur = stRef.current;
      const effectiveState = reset ? { ...cur, cursor: "" } : { ...cur };

      if (reset) {
        setSt(effectiveState);
        stRef.current = effectiveState;
      }

      const r = await AdminApiService.mailOutboxList({
        q: effectiveState.q || undefined,
        kind: effectiveState.kind || undefined,
        cursor: effectiveState.cursor || undefined,
        limit: effectiveState.limit,
      });

      const rows = Array.isArray(r?.items) ? r.items : [];
      setItems((prev) => (reset ? rows : [...prev, ...rows]));
      setNextCursor(r?.nextCursor || null);
    } catch (e) {
      console.error("[AdminMailOutboxScreen] load failed:", e);
      await AlertService.error("Failed to load outbox", e);
    } finally {
      setBusy(false);
    }
  }, []);

  const more = useCallback(async () => {
    try {
      if (!nextCursor || busy) {
        console.warn(
          "[AdminMailOutboxScreen] more: no cursor available or busy",
        );
        return;
      }
      const newState = { ...stRef.current, cursor: String(nextCursor) };
      setSt(newState);
      stRef.current = newState;
      await load(false);
    } catch (e) {
      console.error("[AdminMailOutboxScreen] more failed:", e);
    }
  }, [busy, load, nextCursor]);

  const openRow = useCallback(async (row: MailOutboxItem) => {
    try {
      const id = String((row as any)?._id || "");
      if (!id) {
        console.warn("[AdminMailOutboxScreen] openRow: no id provided");
        return;
      }

      const full = await AdminApiService.mailOutboxRead(id);
      setSelected(full);
      setSelectedOpen(true);
    } catch (e) {
      console.error("[AdminMailOutboxScreen] openRow failed:", e);
      await AlertService.error("Failed to read message", e);
    }
  }, []);

  const close = useCallback(() => {
    setSelectedOpen(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await load(true);
      } catch (e) {
        console.error("[AdminMailOutboxScreen] mount failed:", e);
      }
    })();
  }, [load]);

  const kinds = useMemo(() => ["", "password_invite", "generic"], []);

  return (
    <View style={styles.root} accessibilityLabel="Mock Mail Outbox">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.h1}>Mock Mail Outbox</Text>
          <Text style={styles.subtitle}>
            Messages written by the mock gateway (use to copy reset URLs).
          </Text>
        </View>

        <View style={styles.controls}>
          <TextInput
            value={st.q}
            onChangeText={(v) => setSt((p) => ({ ...p, q: v }))}
            placeholder="search by email/subject"
            accessibilityLabel="Search mail outbox"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.inputWide]}
            returnKeyType="search"
            onSubmitEditing={() => void load(true)}
          />

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={st.kind}
              onValueChange={(v) => {
                const newState = {
                  ...stRef.current,
                  kind: String(v),
                  cursor: "",
                };
                setSt(newState);
                stRef.current = newState;
                void load(true);
              }}
              accessibilityLabel="Filter by kind"
            >
              {kinds.map((k) => (
                <Picker.Item key={k || "all"} label={k || "all"} value={k} />
              ))}
            </Picker>
          </View>

          <Pressable
            onPress={() => void load(true)}
            disabled={busy}
            accessibilityLabel="Reload"
            style={({ pressed }) => [
              styles.btnPrimary,
              busy && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.btnText}>Reload</Text>
          </Pressable>
        </View>
      </View>

      {/* Card + "table" */}
      <View style={styles.card} accessibilityLabel="Outbox table" role="region">
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator />
            <Text style={styles.busyText}>Loading…</Text>
          </View>
        ) : null}

        <ScrollView horizontal contentContainerStyle={styles.tableMinWidth}>
          <View style={styles.table}>
            <View style={[styles.tr, styles.thRow]}>
              <Text style={[styles.th, styles.colAt]}>At</Text>
              <Text style={[styles.th, styles.colTo]}>To</Text>
              <Text style={[styles.th, styles.colKind]}>Kind</Text>
              <Text style={[styles.th, styles.colSubject]}>Subject</Text>
              <Text style={[styles.th, styles.colActions]}>Actions</Text>
            </View>

            {items.map((m) => {
              const id = String((m as any)?._id || "");
              return (
                <View
                  key={id || `${m.createdAt}-${m.to}-${m.subject}`}
                  style={[styles.tr, styles.tdRow]}
                >
                  <Text style={[styles.td, styles.colAt]} numberOfLines={1}>
                    {DateMapper.fmtIso((m as any).createdAt)}
                  </Text>
                  <Text
                    style={[styles.td, styles.colTo, styles.bold]}
                    numberOfLines={1}
                  >
                    {String((m as any).to ?? "-")}
                  </Text>
                  <Text style={[styles.td, styles.colKind]} numberOfLines={1}>
                    {String((m as any).kind ?? "-")}
                  </Text>
                  <Text
                    style={[styles.td, styles.colSubject]}
                    numberOfLines={1}
                  >
                    {String((m as any).subject ?? "-")}
                  </Text>
                  <View style={[styles.td, styles.colActions]}>
                    <Pressable
                      onPress={() => void openRow(m)}
                      accessibilityLabel="Open message"
                      style={({ pressed }) => [
                        styles.btnGhostSm,
                        pressed && styles.btnPressed,
                      ]}
                    >
                      <Text style={styles.btnText}>Open</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {!items.length && !busy ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No messages.</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={() => void more()}
          disabled={!nextCursor || busy}
          accessibilityLabel="Load more"
          style={({ pressed }) => [
            styles.btnGhost,
            (!nextCursor || busy) && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>Load more</Text>
        </Pressable>
      </View>

      {/* Modal (teleport replacement) */}
      <Modal
        visible={selectedOpen}
        transparent
        animationType="none"
        onRequestClose={close}
        presentationStyle="overFullScreen"
      >
        <Pressable
          style={styles.overlay}
          onPress={close}
          accessibilityLabel="Message details"
        >
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
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={styles.panelInner}
            >
              <View style={styles.modalHead}>
                <View style={styles.modalTitleWrap}>
                  <Text style={styles.h2}>Message</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={2}>
                    {String(selected?.to ?? "-")} ·{" "}
                    {String(selected?.subject ?? "-")}
                  </Text>
                </View>

                <Pressable
                  onPress={close}
                  accessibilityLabel="Close"
                  style={styles.btnGhost}
                >
                  <Text style={styles.btnText}>Close</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Text</Text>
                  <ScrollView
                    style={styles.pre}
                    contentContainerStyle={styles.preInner}
                  >
                    <Text style={styles.preText}>
                      {String(selected?.text ?? "-")}
                    </Text>
                  </ScrollView>
                </View>

                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Meta</Text>
                  <ScrollView
                    style={styles.pre}
                    contentContainerStyle={styles.preInner}
                  >
                    <Text style={styles.preText}>
                      {safeJsonPretty((selected as any)?.meta)}
                    </Text>
                  </ScrollView>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12 },
  header: { gap: 10 },
  titleWrap: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "800" },
  subtitle: { opacity: 0.7 },

  controls: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 200,
  },
  inputWide: { minWidth: 260 },

  pickerWrap: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 170,
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
  busyText: { opacity: 0.8 },

  tableMinWidth: { minWidth: 980 },
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

  colAt: { width: 160 },
  colTo: { width: 220 },
  colKind: { width: 170 },
  colSubject: { width: 320 },
  colActions: { width: 110 },

  bold: { fontWeight: "700" },

  empty: { paddingVertical: 24, alignItems: "center" },
  emptyText: { opacity: 0.7 },

  footer: { alignItems: "flex-end" },

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
  },
  panelInner: { width: "100%" },

  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(120,120,140,0.22)",
  },
  modalTitleWrap: { flex: 1, gap: 4 },
  h2: { fontSize: 18, fontWeight: "800" },
  modalSubtitle: { opacity: 0.75 },

  modalBody: { padding: 14, gap: 12 },
  block: { gap: 6 },
  blockLabel: { opacity: 0.7, fontSize: 12 },
  pre: {
    maxHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  preInner: { padding: 10 },
  preText: {
    fontFamily: "monospace",
    opacity: 0.9,
  },
});
