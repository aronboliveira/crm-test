import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDashboardClientsPage } from "../hooks/useDashboardClientsPage";
import { NAV_ROUTES } from "../constants";

export default function DashboardClientsScreen() {
  const nav = useNavigation<any>();
  const { rows, loading, error, nextCursor, q, setQ, load, more } =
    useDashboardClientsPage();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectedClient = useMemo(() => {
    if (!rows.length) return null;
    const firstClient = rows[0] ?? null;
    if (!selectedClientId) return firstClient;
    return rows.find((client) => client.id === selectedClientId) || firstClient;
  }, [rows, selectedClientId]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedClientId(null);
      return;
    }

    const stillExists = rows.some((client) => client.id === selectedClientId);
    if (!selectedClientId || !stillExists) {
      const firstClient = rows[0];
      if (firstClient) {
        setSelectedClientId(firstClient.id);
      }
    }
  }, [rows, selectedClientId]);

  return (
    <View style={styles.page} accessibilityLabel="Clientes">
      <View style={styles.header}>
        <View style={styles.headText}>
          <Text style={styles.h1}>Clientes</Text>
          <Text style={styles.sub}>
            Pesquise e consulte os registros de clientes no painel mobile.
          </Text>
        </View>

        <View style={styles.controls}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="buscar clientes"
            accessibilityLabel="Buscar clientes"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => void load(true)}
          />

          <Pressable
            onPress={() => void load(true)}
            disabled={loading}
            accessibilityLabel="Recarregar clientes"
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
        accessibilityLabel="Tabela de clientes"
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
              <Text style={[styles.th, styles.colName]}>Nome</Text>
              <Text style={[styles.th, styles.colEmail]}>E-mail</Text>
              <Text style={[styles.th, styles.colPhone]}>Telefone</Text>
              <Text style={[styles.th, styles.colCompany]}>Empresa</Text>
              <Text style={[styles.th, styles.colPreferred]}>Preferencial</Text>
            </View>

            {rows.map((client, idx) => {
              const key = String(client.id || `row-${idx}`);
              const isSelected = selectedClient?.id === client.id;

              return (
                <Pressable
                  key={key}
                  onPress={() => setSelectedClientId(client.id)}
                  accessibilityLabel={`Selecionar cliente ${client.name}`}
                  style={({ pressed }) => [
                    styles.tr,
                    styles.tdRow,
                    isSelected && styles.rowSelected,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text
                    style={[styles.td, styles.colName, styles.bold]}
                    numberOfLines={1}
                  >
                    {client.name}
                  </Text>
                  <Text style={[styles.td, styles.colEmail]} numberOfLines={1}>
                    {client.email}
                  </Text>
                  <Text style={[styles.td, styles.colPhone]} numberOfLines={1}>
                    {client.phone}
                  </Text>
                  <Text
                    style={[styles.td, styles.colCompany]}
                    numberOfLines={1}
                  >
                    {client.company}
                  </Text>
                  <Text
                    style={[styles.td, styles.colPreferred]}
                    numberOfLines={1}
                  >
                    {client.preferredContact}
                  </Text>
                </Pressable>
              );
            })}

            {!rows.length && !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {error || "Nenhum cliente encontrado."}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <View
        style={styles.devicesCard}
        accessibilityLabel="Dispositivos do cliente"
      >
        <View style={styles.devicesHeader}>
          <Text style={styles.devicesTitle}>Dispositivos do cliente</Text>
          <Text style={styles.devicesSub}>
            Resumo rápido e acesso ao painel.
          </Text>
        </View>

        {selectedClient ? (
          <View style={styles.devicesSummary}>
            <Text style={styles.devicesLine} numberOfLines={1}>
              Cliente: {selectedClient.name}
            </Text>
            <Text style={styles.devicesLine} numberOfLines={1}>
              Empresa: {selectedClient.company}
            </Text>
            <Text style={styles.devicesHint}>
              Para detalhar os dispositivos desse cliente, abra o dashboard
              principal de Meus Dispositivos.
            </Text>
          </View>
        ) : (
          <Text style={styles.devicesHint}>
            Selecione um cliente para abrir o detalhamento de dispositivos.
          </Text>
        )}

        <Pressable
          onPress={() => nav.navigate(NAV_ROUTES.DASHBOARD.DEVICES)}
          accessibilityLabel="Abrir painel de meus dispositivos"
          style={({ pressed }) => [
            styles.btnGhost,
            styles.devicesAction,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>Ir para Meus Dispositivos</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => void more()}
          disabled={!nextCursor || loading}
          accessibilityLabel="Carregar mais clientes"
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
  rowSelected: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  th: { paddingVertical: 10, paddingRight: 12, fontWeight: "700" },
  td: { paddingVertical: 10, paddingRight: 12 },

  colName: { width: 220 },
  colEmail: { width: 260 },
  colPhone: { width: 180 },
  colCompany: { width: 200 },
  colPreferred: { width: 120 },

  bold: { fontWeight: "700" },

  empty: { paddingVertical: 24, alignItems: "center" },
  emptyText: { opacity: 0.7 },

  devicesCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  devicesHeader: { gap: 2 },
  devicesTitle: { fontSize: 16, fontWeight: "800" },
  devicesSub: { opacity: 0.75 },
  devicesSummary: { gap: 4 },
  devicesLine: { fontWeight: "600" },
  devicesHint: { opacity: 0.78 },
  devicesAction: { alignSelf: "flex-start" },

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
