import React, { useMemo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import PolicyService from "../services/PolicyService";

/**
 * RN replacement for <DashboardHome />
 * Replace this with your real RN component implementation.
 */
function DashboardHome() {
  return (
    <View style={styles.homeCard} accessibilityLabel="Dashboard home">
      <Text style={styles.homeTitle}>Welcome</Text>
      <Text style={styles.homeSub}>
        This is a placeholder for the DashboardHome component.
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
    // Route names are examples; change to your actual stack route names.
    nav.navigate("Projects");
  }, [nav]);

  const goTasks = useCallback(() => {
    nav.navigate("Tasks");
  }, [nav]);

  return (
    <View style={styles.page} accessibilityLabel="Dashboard">
      <View style={styles.header}>
        <Text style={styles.h1}>Dashboard</Text>
      </View>

      <DashboardHome />

      <View style={styles.nav} accessibilityLabel="Dashboard sections">
        {canProjects ? (
          <Pressable
            onPress={goProjects}
            accessibilityLabel="Projects"
            style={({ pressed }) => [
              styles.btnOutline,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.btnText}>Projects</Text>
          </Pressable>
        ) : null}

        {canTasks ? (
          <Pressable
            onPress={goTasks}
            accessibilityLabel="Tasks"
            style={({ pressed }) => [
              styles.btnOutline,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.btnText}>Tasks</Text>
          </Pressable>
        ) : null}
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
