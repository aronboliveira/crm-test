/**
 * Dashboard Devices Screen
 * Mobile version of the Devices dashboard with list, filters, and device management
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import DevicesService, {
  type Device,
  type DeviceListQuery,
  type CreateDeviceDto,
  type UpdateDeviceDto,
} from "../services/DevicesService";
import AlertService from "../services/AlertService";
import { NAV_ROUTES } from "../constants";

const STATUS_LABELS = {
  online: "Ativo",
  offline: "Inativo",
  maintenance: "Manutenção",
} as const;

const KIND_LABELS = {
  physical: "Físico",
  virtual: "Virtual",
} as const;

export default function DashboardDevicesScreen() {
  const nav = useNavigation();

  // State
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDevices, setTotalDevices] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Device["status"] | "all">(
    "all",
  );
  const [kindFilter, setKindFilter] = useState<Device["kind"] | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<CreateDeviceDto>({
    name: "",
    kind: "physical",
    status: "offline",
    vendor: "",
    model: "",
    operatingSystem: "",
    host: "",
    ipAddress: "",
    serialNumber: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /**
   * Load devices from API
   */
  const loadDevices = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const query: DeviceListQuery = {
          page: 1,
          pageSize: 100,
          sortBy: "updatedAt",
          sortDir: "desc",
        };

        if (searchQuery.trim()) {
          query.q = searchQuery.trim();
        }
        if (statusFilter !== "all") {
          query.status = statusFilter;
        }
        if (kindFilter !== "all") {
          query.kind = kindFilter;
        }

        const response = await DevicesService.list(query);

        setDevices(response.rows);
        setTotalDevices(response.total);

        // Calculate stats
        const online = response.rows.filter(
          (d) => d.status === "online",
        ).length;
        const offline = response.rows.filter(
          (d) => d.status === "offline",
        ).length;
        setOnlineCount(online);
        setOfflineCount(offline);
      } catch (err) {
        setError("Erro ao carregar dispositivos");
        console.error("Error loading devices:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, statusFilter, kindFilter],
  );

  /**
   * Initial load
   */
  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    void loadDevices(true);
  }, [loadDevices]);

  /**
   * Open form for new device
   */
  const handleAddDevice = () => {
    setEditingDevice(null);
    setFormData({
      name: "",
      kind: "physical",
      status: "offline",
      vendor: "",
      model: "",
      operatingSystem: "",
      host: "",
      ipAddress: "",
      serialNumber: "",
    });
    setFormErrors({});
    setShowForm(true);
  };

  /**
   * Open form for editing device
   */
  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      kind: device.kind,
      status: device.status,
      vendor: device.vendor || "",
      model: device.model || "",
      operatingSystem: device.operatingSystem || "",
      host: device.host || "",
      ipAddress: device.ipAddress || "",
      serialNumber: device.serialNumber || "",
    });
    setFormErrors({});
    setShowForm(true);
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Nome é obrigatório";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Submit form
   */
  const handleSubmitForm = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (editingDevice) {
        await DevicesService.update(editingDevice.id, formData);
        AlertService.success("Dispositivo atualizado com sucesso!");
      } else {
        await DevicesService.create(formData);
        AlertService.success("Dispositivo criado com sucesso!");
      }

      setShowForm(false);
      void loadDevices();
    } catch (err) {
      AlertService.error("Erro ao salvar dispositivo");
      console.error("Error saving device:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete device
   */
  const handleDeleteDevice = async (device: Device) => {
    const confirmed = await AlertService.confirm(
      "Confirmar exclusão",
      `Tem certeza que deseja excluir o dispositivo "${device.name}"?`,
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await DevicesService.delete(device.id);
      AlertService.success("Dispositivo excluído com sucesso!");
      void loadDevices();
    } catch (err) {
      AlertService.error("Erro ao excluir dispositivo");
      console.error("Error deleting device:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply filters
   */
  const handleApplyFilters = () => {
    setShowFilters(false);
    void loadDevices();
  };

  /**
   * Clear filters
   */
  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setKindFilter("all");
    setShowFilters(false);
    void loadDevices();
  };

  /**
   * Render device card
   */
  const renderDeviceCard = ({ item }: { item: Device }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "online" && styles.statusOnline,
            item.status === "offline" && styles.statusOffline,
            item.status === "maintenance" && styles.statusMaintenance,
          ]}
        >
          <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>Tipo:</Text>
        <Text style={styles.cardValue}>{KIND_LABELS[item.kind]}</Text>

        {item.vendor && (
          <>
            <Text style={styles.cardLabel}>Fabricante:</Text>
            <Text style={styles.cardValue}>{item.vendor}</Text>
          </>
        )}

        {item.model && (
          <>
            <Text style={styles.cardLabel}>Modelo:</Text>
            <Text style={styles.cardValue}>{item.model}</Text>
          </>
        )}

        {item.ipAddress && (
          <>
            <Text style={styles.cardLabel}>IP:</Text>
            <Text style={styles.cardValue}>{item.ipAddress}</Text>
          </>
        )}

        {item.ownerEmail && (
          <>
            <Text style={styles.cardLabel}>Responsável:</Text>
            <Text style={styles.cardValue}>{item.ownerEmail}</Text>
          </>
        )}
      </View>

      <View style={styles.cardActions}>
        <Pressable
          style={styles.btnSecondary}
          onPress={() => handleEditDevice(item)}
        >
          <Text style={styles.btnSecondaryText}>Editar</Text>
        </Pressable>
        <Pressable
          style={styles.btnDanger}
          onPress={() => void handleDeleteDevice(item)}
        >
          <Text style={styles.btnDangerText}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dispositivos</Text>
        <Pressable style={styles.btnPrimary} onPress={handleAddDevice}>
          <Text style={styles.btnPrimaryText}>+ Novo</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{totalDevices}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Ativos</Text>
          <Text style={[styles.statValue, styles.statOnline]}>
            {onlineCount}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Inativos</Text>
          <Text style={[styles.statValue, styles.statOffline]}>
            {offlineCount}
          </Text>
        </View>
      </View>

      {/* Search and filters */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={"Buscar dispositivos..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => void loadDevices()}
        />
        <Pressable
          style={styles.filterBtn}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterBtnText}>Filtros</Text>
        </Pressable>
      </View>

      {/* Device list */}
      {error && <Text style={styles.error}>{error}</Text>}

      {loading && !refreshing ? (
        <ActivityIndicator size={"large"} style={styles.loader} />
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderDeviceCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum dispositivo encontrado</Text>
          }
        />
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType={"slide"}
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtros</Text>

            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerContainer}>
              <Pressable
                style={[
                  styles.pickerOption,
                  statusFilter === "all" && styles.pickerOptionActive,
                ]}
                onPress={() => setStatusFilter("all")}
              >
                <Text>Todos</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickerOption,
                  statusFilter === "online" && styles.pickerOptionActive,
                ]}
                onPress={() => setStatusFilter("online")}
              >
                <Text>Ativo</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickerOption,
                  statusFilter === "offline" && styles.pickerOptionActive,
                ]}
                onPress={() => setStatusFilter("offline")}
              >
                <Text>Inativo</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickerOption,
                  statusFilter === "maintenance" && styles.pickerOptionActive,
                ]}
                onPress={() => setStatusFilter("maintenance")}
              >
                <Text>Manutenção</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.pickerContainer}>
              <Pressable
                style={[
                  styles.pickerOption,
                  kindFilter === "all" && styles.pickerOptionActive,
                ]}
                onPress={() => setKindFilter("all")}
              >
                <Text>Todos</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickerOption,
                  kindFilter === "physical" && styles.pickerOptionActive,
                ]}
                onPress={() => setKindFilter("physical")}
              >
                <Text>Físico</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickerOption,
                  kindFilter === "virtual" && styles.pickerOptionActive,
                ]}
                onPress={() => setKindFilter("virtual")}
              >
                <Text>Virtual</Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.btnSecondary}
                onPress={handleClearFilters}
              >
                <Text style={styles.btnSecondaryText}>Limpar</Text>
              </Pressable>
              <Pressable style={styles.btnPrimary} onPress={handleApplyFilters}>
                <Text style={styles.btnPrimaryText}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Form Modal */}
      <Modal
        visible={showForm}
        animationType={"slide"}
        transparent
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingDevice ? "Editar Dispositivo" : "Novo Dispositivo"}
            </Text>

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={[styles.input, formErrors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              placeholder={"Nome do dispositivo"}
            />
            {formErrors.name && (
              <Text style={styles.errorText}>{formErrors.name}</Text>
            )}

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.pickerContainer}>
              <Pressable
                style={[
                  styles.pickerOption,
                  formData.kind === "physical" && styles.pickerOptionActive,
                ]}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, kind: "physical" }))
                }
              >
                <Text>Físico</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickerOption,
                  formData.kind === "virtual" && styles.pickerOptionActive,
                ]}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, kind: "virtual" }))
                }
              >
                <Text>Virtual</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerContainer}>
              <Pressable
                style={[
                  styles.pickerOption,
                  formData.status === "online" && styles.pickerOptionActive,
                ]}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, status: "online" }))
                }
              >
                <Text>Ativo</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickerOption,
                  formData.status === "offline" && styles.pickerOptionActive,
                ]}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, status: "offline" }))
                }
              >
                <Text>Inativo</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickerOption,
                  formData.status === "maintenance" &&
                    styles.pickerOptionActive,
                ]}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, status: "maintenance" }))
                }
              >
                <Text>Manutenção</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Fabricante</Text>
            <TextInput
              style={styles.input}
              value={formData.vendor}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, vendor: text }))
              }
              placeholder={"Ex: Dell, HP, Lenovo"}
            />

            <Text style={styles.label}>Modelo</Text>
            <TextInput
              style={styles.input}
              value={formData.model}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, model: text }))
              }
              placeholder={"Ex: Latitude 5420"}
            />

            <Text style={styles.label}>Sistema Operacional</Text>
            <TextInput
              style={styles.input}
              value={formData.operatingSystem}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, operatingSystem: text }))
              }
              placeholder={"Ex: Windows 11, Ubuntu 22.04"}
            />

            <Text style={styles.label}>Host</Text>
            <TextInput
              style={styles.input}
              value={formData.host}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, host: text }))
              }
              placeholder={"Ex: workstation-01"}
            />

            <Text style={styles.label}>Endereço IP</Text>
            <TextInput
              style={styles.input}
              value={formData.ipAddress}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, ipAddress: text }))
              }
              placeholder={"Ex: 192.168.1.10"}
            />

            <Text style={styles.label}>Número de Série</Text>
            <TextInput
              style={styles.input}
              value={formData.serialNumber}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, serialNumber: text }))
              }
              placeholder={"Ex: ABC123456"}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.btnSecondary}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.btnPrimary}
                onPress={() => void handleSubmitForm()}
                disabled={loading}
              >
                <Text style={styles.btnPrimaryText}>
                  {loading ? "Salvando..." : "Salvar"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  stats: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  statOnline: {
    color: "#22c55e",
  },
  statOffline: {
    color: "#64748b",
  },
  searchRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  filterBtn: {
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    justifyContent: "center",
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOnline: {
    backgroundColor: "#dcfce7",
  },
  statusOffline: {
    backgroundColor: "#f1f5f9",
  },
  statusMaintenance: {
    backgroundColor: "#fef3c7",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardBody: {
    gap: 4,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  cardValue: {
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  btnSecondary: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  btnSecondaryText: {
    color: "#1e293b",
    fontSize: 14,
    fontWeight: "600",
  },
  btnDanger: {
    backgroundColor: "#fef2f2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  btnDangerText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
  loader: {
    marginTop: 48,
  },
  error: {
    margin: 16,
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    color: "#ef4444",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 48,
    fontSize: 14,
    color: "#64748b",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    color: "#1e293b",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 44,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
  },
  pickerOptionActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
});
