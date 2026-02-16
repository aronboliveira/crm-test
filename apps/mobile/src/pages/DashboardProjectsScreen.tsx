import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useDashboardProjectsPage } from "../hooks/useDashboardProjectsPage";

export default function DashboardProjectsScreen() {
  const { rows, loading, error, nextCursor, q, setQ, load, more } =
    useDashboardProjectsPage();

  return (
    <View style={styles.page} accessibilityLabel="Projetos">
      <View style={styles.header}>
        <View style={styles.headText}>
          <Text style={styles.h1}>Projetos</Text>
          <Text style={styles.sub}>
            Os dados vêm do store; se o endpoint do backend não existir, o
            fallback de desenvolvimento usa mocks.
          </Text>
        </View>

        <View style={styles.controls}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="buscar"
            accessibilityLabel="Buscar projetos"
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
        accessibilityLabel="Tabela de projetos"
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
              <Text style={[styles.th, styles.colCode]}>Código</Text>
              <Text style={[styles.th, styles.colName]}>Nome</Text>
              <Text style={[styles.th, styles.colOwner]}>Responsável</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
              <Text style={[styles.th, styles.colDue]}>Prazo</Text>
              <Text style={[styles.th, styles.colActions]}>Ações</Text>
            </View>

            {rows.map((p, idx) => {
              const key = String((p as any)?.id || `row-${idx}`);
              return (
                <View key={key} style={[styles.tr, styles.tdRow]}>
                  <Text
                    style={[styles.td, styles.colCode, styles.bold]}
                    numberOfLines={1}
                  >
                    {String((p as any)?.code ?? "-")}
                  </Text>
                  <Text style={[styles.td, styles.colName]} numberOfLines={1}>
                    {String((p as any)?.name ?? "-")}
                  </Text>
                  <Text style={[styles.td, styles.colOwner]} numberOfLines={1}>
                    {String((p as any)?.ownerEmail ?? "-")}
                  </Text>
                  <Text style={[styles.td, styles.colStatus]} numberOfLines={1}>
                    {String((p as any)?.status ?? "-")}
                  </Text>
                  <Text style={[styles.td, styles.colDue]} numberOfLines={1}>
                    {String((p as any)?.dueAt ?? "-")}
                  </Text>

                  <View style={[styles.td, styles.colActions]}>
                    <Pressable
                      onPress={() =>
                        nav.navigate(
                          "ProjectEdit" as never,
                          { id: p.id } as never,
                        )
                      }
                      accessibilityLabel="Editar projeto"
                      style={({ pressed }) => [
                        styles.btnGhostSm,
                        pressed && styles.btnPressed,
                      ]}
                    >
                      <Text style={styles.btnText}>Editar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {!rows.length && !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {error || "Nenhum projeto encontrado."}
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

  colCode: { width: 120 },
  colName: { width: 280 },
  colOwner: { width: 240 },
  colStatus: { width: 130 },
  colDue: { width: 140 },
  colActions: { width: 120 },

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
});
