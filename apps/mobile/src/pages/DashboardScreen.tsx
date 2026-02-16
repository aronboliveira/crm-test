import React, { useMemo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import PolicyService from "../services/PolicyService";
import { NAV_ROUTES } from "../constants";

/**
 * RN replacement for <DashboardHome />
 * Replace this with your real RN component implementation.
 */
function DashboardHome() {
  return (
    <View style={styles.homeCard} accessibilityLabel="Início do dashboard">
      <Text style={styles.homeTitle}>Bem-vindo</Text>
      <Text style={styles.homeSub}>
        Este é um espaço temporário para o conteúdo inicial do dashboard.
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const nav = useNavigation<any>();

  // === inline equivalent of useDashboardPage() ===
  const canProjects = useMemo(() => {
    try {
      // Choose your actual permission codes. If you had "projects.read" in Vue, use the same.
      return PolicyService.can?.("projects.read") ?? true;
    } catch {
      return true;
    }
  }, []);

  const canTasks = useMemo(() => {
    try {
      return PolicyService.can?.("tasks.read") ?? true;
    } catch {
      return true;
    }
  }, []);

  const goProjects = useCallback(() => {
    nav.navigate(NAV_ROUTES.DASHBOARD.PROJECTS);
  }, [nav]);

  const goTasks = useCallback(() => {
    nav.navigate(NAV_ROUTES.DASHBOARD.TASKS);
  }, [nav]);

  const goClients = useCallback(() => {
    nav.navigate(NAV_ROUTES.DASHBOARD.CLIENTS);
  }, [nav]);

  const goDevices = useCallback(() => {
    nav.navigate(NAV_ROUTES.DASHBOARD.DEVICES);
  }, [nav]);

  return (
    <View style={styles.page} accessibilityLabel="Painel">
      <View style={styles.header}>
        <Text style={styles.h1}>Painel</Text>
      </View>

      <DashboardHome />

      <View style={styles.nav} accessibilityLabel="Seções do painel">
        {canProjects ? (
          <Pressable
            onPress={goProjects}
            accessibilityLabel="Projetos"
            style={({ pressed }) => [
              styles.btnOutline,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.btnText}>Projetos</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={goClients}
          accessibilityLabel="Clientes"
          style={({ pressed }) => [
            styles.btnOutline,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>Clientes</Text>
        </Pressable>

        {canTasks ? (
          <Pressable
            onPress={goTasks}
            accessibilityLabel="Tarefas"
            style={({ pressed }) => [
              styles.btnOutline,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.btnText}>Tarefas</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={goDevices}
          accessibilityLabel="Meus dispositivos"
          style={({ pressed }) => [
            styles.btnOutline,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>Meus Dispositivos</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { fontSize: 26, fontWeight: "900" },

  nav: { flexDirection: "row", gap: 10, flexWrap: "wrap" },

  btnOutline: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnText: { fontWeight: "700" },
  btnPressed: { opacity: 0.85 },

  homeCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  homeTitle: { fontSize: 18, fontWeight: "800" },
  homeSub: { opacity: 0.75 },
});
