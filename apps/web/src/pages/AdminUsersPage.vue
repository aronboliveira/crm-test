<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAdminUsersPage } from "../assets/scripts/pages/useAdminUsersPage";
import { usePolicyStore } from "../pinia/stores/policy.store";
import AdminUserDetailsDrawer from "../components/admin/AdminUserDetailsDrawer.vue";
import CreateUserModal from "../components/admin/CreateUserModal.vue";
import AdminApiService from "../services/AdminApiService";
import ModalService from "../services/ModalService";
import AdminUsersQueryStateService from "../services/AdminUsersQueryStateService";
import TableExportFlowOrchestrator from "../services/TableExportFlowOrchestrator";
import {
  ADMIN_USERS_EXPORT_CENTERED_COLUMNS,
  ADMIN_USERS_EXPORT_COLUMNS,
  ADMIN_USERS_EXPORT_COLUMN_KEYS,
  ADMIN_USERS_EXPORT_COLUMN_WIDTHS,
  AdminUsersCsvBlueprint,
  SpreadsheetExporter,
  type AdminUsersExportColumnKey,
  type AdminUsersExportRow,
  type SpreadsheetExportFormat,
} from "../utils/export";
import type { AdminUserRow } from "../types/admin.types";

const {
  createOpen,
  openCreate,
  closeCreate,
  can,
  st,
  rows,
  busy,
  nextCursor,
  drawerOpen,
  drawerUserId,
  openDrawer,
  closeDrawer,
  load,
  setRole,
  forceReset,
} = useAdminUsersPage();

const policy = usePolicyStore();
const isAdmin = computed(() => policy.can("admin.full"));
const route = useRoute();
const router = useRouter();
const DashboardTableExportModal = defineAsyncComponent(
  () => import("../components/dashboard/DashboardTableExportModal.vue"),
);
let hydratingFromRoute = false;

const roleLabels: Record<string, string> = {
  viewer: "Visualizador",
  member: "Membro",
  manager: "Gerente",
  admin: "Administrador",
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const displayName = (u: any): string => {
  if (u.name) return u.name;
  if (u.firstName || u.lastName)
    return [u.firstName, u.lastName].filter(Boolean).join(" ");
  const local = (u.email || "").split("@")[0] || "";
  return local.charAt(0).toUpperCase() + local.slice(1);
};

type DashboardTableExportDialogResult = {
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
};

const DEFAULT_EXPORT_COLUMN_KEYS = [
  ...ADMIN_USERS_EXPORT_COLUMN_KEYS,
] as AdminUsersExportColumnKey[];
const EXPORT_FETCH_LIMIT = 200;
const EXPORT_MAX_PAGES = 100;

const usersExporter = new SpreadsheetExporter<
  AdminUsersExportRow,
  AdminUsersExportColumnKey,
  AdminUsersCsvBlueprint
>({
  fileNamePrefix: "usuarios-admin",
  sheetName: "Usuários",
  defaultColumnKeys: DEFAULT_EXPORT_COLUMN_KEYS,
  buildBlueprint: (columnKeys) => new AdminUsersCsvBlueprint({ columns: columnKeys }),
  columnWidthByKey: ADMIN_USERS_EXPORT_COLUMN_WIDTHS,
  centeredColumnKeys: ADMIN_USERS_EXPORT_CENTERED_COLUMNS,
  resolveCellStyle: ({ columnKey, record }) => {
    if (columnKey === "perfil" && record.perfil === "Administrador") {
      return {
        fillColor: "FFFEE2E2",
        fontColor: "FFB91C1C",
        bold: true,
        align: "center",
      };
    }
    if (columnKey === "bloqueado" && record.bloqueado === "Sim") {
      return {
        fillColor: "FFFFF7ED",
        fontColor: "FF9A3412",
        bold: true,
        align: "center",
      };
    }
    return null;
  },
});
const exportFlow = new TableExportFlowOrchestrator("AdminUsersPage");

const visibleExportColumns = computed(() =>
  ADMIN_USERS_EXPORT_COLUMNS.filter((column) => {
    if (isAdmin.value) return true;
    return column.key !== "tokenVersion" && column.key !== "senhaAtualizada";
  }),
);

const defaultVisibleExportKeys = computed(
  () => visibleExportColumns.value.map((column) => column.key),
);

const buildUsersExportRows = (
  sourceRows: readonly AdminUserRow[] = rows.value,
): AdminUsersExportRow[] =>
  sourceRows
    .filter((user): user is AdminUserRow => !!user)
    .map((user) => ({
      nome: displayName(user),
      email: user.email || "—",
      perfil: roleLabels[user.roleKey] || user.roleKey || "—",
      tokenVersion: isAdmin.value ? user.tokenVersion : "—",
      senhaAtualizada: isAdmin.value ? fmtDate(user.passwordUpdatedAt) : "—",
      criadoEm: fmtDate(user.createdAt),
      bloqueado: user.lockedAt ? "Sim" : "Não",
    }));

const fetchAllFilteredRowsForExport = async (): Promise<AdminUserRow[]> => {
  const deduped = new Map<string, AdminUserRow>();
  let cursor: string | undefined;

  for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
    const response = await AdminApiService.usersList({
      q: st.value.q.trim() || undefined,
      roleKey: st.value.roleKey.trim() || undefined,
      cursor,
      limit: EXPORT_FETCH_LIMIT,
    });

    const pageRows = Array.isArray(response?.items) ? response.items : [];
    if (!pageRows.length) break;

    pageRows.forEach((row) => {
      if (!row?.id) return;
      deduped.set(String(row.id), row);
    });

    const next = String(response?.nextCursor || "").trim();
    if (!next) break;
    cursor = next;
  }

  return [...deduped.values()];
};

const openExportDialog =
  async (): Promise<DashboardTableExportDialogResult | null> =>
    ModalService.open<DashboardTableExportDialogResult>(
      DashboardTableExportModal,
      {
        title: "Exportar Usuários",
        size: "md",
        data: {
          presetKey: "admin.users",
          totalRows: rows.value.length,
          entityLabel: "usuário(s)",
          columnOptions: visibleExportColumns.value,
          defaultColumnKeys: [...defaultVisibleExportKeys.value],
          defaultFormats: ["csv", "xlsx"] as SpreadsheetExportFormat[],
        },
      },
    );

const handleOpenExportModal = async (): Promise<void> => {
  await exportFlow.execute({
    openDialog: openExportDialog,
    emptyStateMessage: "Não há usuários para exportar.",
    buildRecords: async () => buildUsersExportRows(await fetchAllFilteredRowsForExport()),
    exportRecords: async (records, selection) =>
      usersExporter.export(records, {
        formats: selection.formats,
        columnKeys: selection.columnKeys as AdminUsersExportColumnKey[],
      }),
  });
};

const buildRouteState = () => ({
  q: String(st.value.q || "").trim(),
  roleKey: String(st.value.roleKey || "").trim(),
});

const applyRouteState = (query: typeof route.query): boolean => {
  const parsed = AdminUsersQueryStateService.fromQuery(query);
  const hasChanges =
    parsed.q !== String(st.value.q || "").trim() ||
    parsed.roleKey !== String(st.value.roleKey || "").trim();

  if (!hasChanges) return false;

  hydratingFromRoute = true;
  st.value.q = parsed.q;
  st.value.roleKey = parsed.roleKey;
  hydratingFromRoute = false;
  return true;
};

const syncRouteQuery = (): void => {
  if (hydratingFromRoute) return;
  const nextState = buildRouteState();
  if (AdminUsersQueryStateService.isSameState(route.query, nextState)) {
    return;
  }
  void router
    .replace({ query: AdminUsersQueryStateService.toQuery(nextState) })
    .catch((caughtError) => {
      console.error("[AdminUsersPage] route sync failed:", caughtError);
    });
};

applyRouteState(route.query);

watch(
  [() => st.value.q, () => st.value.roleKey],
  () => {
    syncRouteQuery();
  },
);

watch(
  () => route.query,
  (query) => {
    const changed = applyRouteState(query);
    if (changed) {
      void load(true);
    }
  },
);

onMounted(() => {
  syncRouteQuery();
});
</script>

<template>
  <div v-if="can" class="p-4 grid gap-3" aria-label="Gerenciamento de usuários">
    <header class="flex flex-wrap gap-2 items-end justify-between">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Usuários</h1>
        <p class="opacity-70">
          Gerenciamento de usuários (somente administradores).
        </p>
      </div>

      <div class="grid gap-2" style="min-width: min(520px, 100%)">
        <div class="grid gap-2" style="grid-template-columns: 1fr 180px">
          <label class="grid gap-1">
            <span class="font-semibold">Buscar</span>
            <input
              class="table-search-input"
              v-model="st.q"
              name="q"
              autocomplete="off"
              aria-label="Buscar por e-mail"
              placeholder="e-mail contém..."
              @keyup.enter="load(true)"
            />
          </label>

          <label class="grid gap-1">
            <span class="font-semibold">Perfil</span>
            <select
              class="table-search-input"
              v-model="st.roleKey"
              aria-label="Filtrar por perfil"
              @change="load(true)"
            >
              <option value="">Todos</option>
              <option value="viewer">Visualizador</option>
              <option value="member">Membro</option>
              <option value="manager">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
        </div>

        <div class="flex gap-2 justify-end">
          <button
            class="btn btn-ghost"
            type="button"
            title="Exportar visão atual de usuários"
            @click="handleOpenExportModal"
          >
            Exportar...
          </button>
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="busy"
            :aria-disabled="busy"
            @click="load(true)"
          >
            Atualizar
          </button>
        </div>
      </div>
    </header>

    <div
      class="card p-3 overflow-auto"
      role="region"
      aria-label="Tabela de usuários"
    >
      <table
        class="min-w-[920px] w-full"
        role="table"
        aria-label="Lista de usuários"
      >
        <thead>
          <tr class="text-left opacity-80">
            <th class="py-2 pr-3">Nome</th>
            <th class="py-2 pr-3">E-mail</th>
            <th class="py-2 pr-3">Perfil</th>
            <th v-if="isAdmin" class="py-2 pr-3">Token v.</th>
            <th v-if="isAdmin" class="py-2 pr-3">Senha atualizada</th>
            <th class="py-2 pr-3">Criado em</th>
            <th class="py-2 pr-3">Ações</th>
            <th class="py-2 pr-3">Bloqueado</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="u in rows" :key="u.id" class="border-t border-white/10">
            <td class="py-2 pr-3 font-semibold">{{ displayName(u) }}</td>
            <td class="py-2 pr-3">
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                aria-label="Abrir detalhes do usuário"
                @click="openDrawer(u)"
              >
                {{ u.email }}
              </button>
            </td>
            <td class="py-2 pr-3">
              <span
                class="admin-role-badge"
                :class="'admin-role-badge--' + (u.roleKey || 'viewer')"
              >
                {{ roleLabels[u.roleKey] || u.roleKey || "—" }}
              </span>
            </td>
            <td v-if="isAdmin" class="py-2 pr-3">{{ u.tokenVersion }}</td>
            <td v-if="isAdmin" class="py-2 pr-3">
              {{ fmtDate(u.passwordUpdatedAt) }}
            </td>
            <td class="py-2 pr-3">{{ fmtDate(u.createdAt) }}</td>
            <td class="py-2 pr-3">
              <div class="flex gap-2">
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  aria-label="Alterar perfil"
                  @click="setRole(u)"
                >
                  Perfil
                </button>

                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  aria-label="Forçar redefinição"
                  @click="forceReset(u)"
                >
                  Redefinir
                </button>
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  aria-label="Ver detalhes"
                  @click="openDrawer(u)"
                >
                  Ver
                </button>
              </div>
            </td>
            <td class="py-2 pr-3">{{ u.lockedAt ? "Sim" : "Não" }}</td>
          </tr>

          <tr v-if="!rows.length && !busy">
            <td :colspan="isAdmin ? 8 : 6" class="py-6 opacity-70 text-center">
              Nenhum usuário encontrado.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex gap-2 justify-end">
      <button
        class="btn btn-primary"
        type="button"
        :disabled="busy || !nextCursor"
        :aria-disabled="busy || !nextCursor"
        @click="load(false)"
      >
        Carregar mais
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="busy"
        :aria-disabled="busy"
        @click="openCreate"
      >
        Criar usuário
      </button>
    </div>
    <AdminUserDetailsDrawer
      :open="drawerOpen"
      :userId="drawerUserId"
      @close="closeDrawer"
      @updated="load(true)"
    />
    <CreateUserModal
      :open="createOpen"
      @close="closeCreate"
      @created="load(true)"
    />
  </div>

  <div v-else class="p-6 opacity-70" aria-label="Acesso negado">
    Você não tem permissão para acessar esta página.
  </div>
</template>

<style scoped lang="scss">
.admin-role-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: capitalize;
}

.admin-role-badge--viewer {
  background: var(--surface-3, #e2e8f0);
  color: var(--text-2, #475569);
}

.admin-role-badge--member {
  background: var(--info-soft, #dbeafe);
  color: var(--info, #2563eb);
}

.admin-role-badge--manager {
  background: var(--warning-soft, #fef3c7);
  color: var(--warning, #d97706);
}

.admin-role-badge--admin {
  background: var(--danger-soft, #fee2e2);
  color: var(--danger, #dc2626);
}
</style>
