import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useDashboardTasksPage } from "../hooks/useDashboardTasksPage";

export default function DashboardTasksScreen() {
  const { rows, q, setQ, loading, error, nextCursor, load, more } =
    useDashboardTasksPage();

  useEffect(() => {
    void load(true);
  }, [load]);

  return (
    <View style={styles.page} accessibilityLabel="Tarefas">
      <View style={styles.header}>
        <View style={styles.headText}>
          <Text style={styles.h1}>Tarefas</Text>
          <Text style={styles.sub}>
            Pesquise e consulte tarefas no mesmo padrão de tabela do painel.
          </Text>
        </View>

        <View style={styles.controls}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="buscar"
            accessibilityLabel="Buscar tarefas"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => void load(true)}
          />

          <Pressable
            onPress={() => void load(true)}
            disabled={loading}
            accessibilityLabel="Recarregar"
            style={({ pressed }) => [
              styles.btnPrimary,
              loading && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.btnText}>Recarregar</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={styles.card}
        accessibilityLabel="Tabela de tarefas"
        role="region"
      >
        {loading ? (
          <View style={styles.busyRow}>
            <ActivityIndicator />
            <Text style={styles.busyText}>Carregando…</Text>
          </View>
        ) : null}

        <ScrollView horizontal contentContainerStyle={styles.tableMinWidth}>
          <View style={styles.table}>
            <View style={[styles.tr, styles.thRow]}>
              <Text style={[styles.th, styles.colTitle]}>Título</Text>
              <Text style={[styles.th, styles.colProject]}>Projeto</Text>
              <Text style={[styles.th, styles.colAssignee]}>Responsável</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
              <Text style={[styles.th, styles.colPriority]}>Prioridade</Text>
              <Text style={[styles.th, styles.colDue]}>Prazo</Text>
            </View>

            {rows.map((task, index) => {
              const key = String(task?.id || `task-row-${index}`);
              return (
                <View key={key} style={[styles.tr, styles.tdRow]}>
                  <Text
                    style={[styles.td, styles.colTitle, styles.bold]}
                    numberOfLines={1}
                  >
                    {String(task?.title ?? "-")}
                  </Text>
                  <Text
                    style={[styles.td, styles.colProject]}
                    numberOfLines={1}
                  >
                    {String(task?.projectId ?? "-")}
                  </Text>
                  <Text
                    style={[styles.td, styles.colAssignee]}
                    numberOfLines={1}
                  >
                    {String(task?.assigneeEmail ?? "-")}
                  </Text>
                  <Text style={[styles.td, styles.colStatus]} numberOfLines={1}>
                    {String(task?.status ?? "-")}
                  </Text>
                  <Text
                    style={[styles.td, styles.colPriority]}
                    numberOfLines={1}
                  >
                    {String(task?.priority ?? "-")}
                  </Text>
                  <Text style={[styles.td, styles.colDue]} numberOfLines={1}>
                    {String(task?.dueAt ?? "-")}
                  </Text>
                </View>
              );
            })}

            {!rows.length && !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {error || "Nenhuma tarefa encontrada."}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => void more()}
          disabled={!nextCursor || loading}
          accessibilityLabel="Carregar mais"
          style={({ pressed }) => [
            styles.btnGhost,
            (!nextCursor || loading) && styles.btnDisabled,
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
  page: { flex: 1, padding: 16, gap: 12 },

  header: { gap: 10 },
  headText: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "800" },
  sub: { opacity: 0.7 },

  controls: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  input: {
    minWidth: 220,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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

  colTitle: { width: 280 },
  colProject: { width: 140 },
  colAssignee: { width: 240 },
  colStatus: { width: 130 },
  colPriority: { width: 100 },
  colDue: { width: 140 },

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
});
