<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import BarChart from "../components/charts/BarChart.vue";
import DonutChart from "../components/charts/DonutChart.vue";
import { useAuthStore } from "../pinia/stores/auth.store";
import { useDashboardDevicesPage } from "../assets/scripts/pages/useDashboardDevicesPage";
import DeviceAnalyticsService from "../services/DeviceAnalyticsService";
import ApiClientService from "../services/ApiClientService";
import DeviceQueryStateService from "../services/DeviceQueryStateService";
import DevicesCustomerCriteriaService, {
  DEVICES_CUSTOMER_CRITERIA_UPDATED_EVENT,
  type CustomerDeviceCriteria,
} from "../services/DevicesCustomerCriteriaService";
import SmartAutocompleteService from "../services/SmartAutocompleteService";
import AlertService from "../services/AlertService";
import FormValidationStateService from "../services/FormValidationStateService";
import ModalService from "../services/ModalService";
import TableExportFlowOrchestrator from "../services/TableExportFlowOrchestrator";
import {
  DASHBOARD_DEVICES_EXPORT_CENTERED_COLUMNS,
  DASHBOARD_DEVICES_EXPORT_COLUMNS,
  DASHBOARD_DEVICES_EXPORT_COLUMN_KEYS,
  DASHBOARD_DEVICES_EXPORT_COLUMN_WIDTHS,
  DashboardDevicesCsvBlueprint,
  SpreadsheetExporter,
  type DashboardDevicesExportColumnKey,
  type DashboardDevicesExportRow,
  type SpreadsheetExportFormat,
} from "../utils/export";
import type {
  DeviceAnalyticsQuery,
  DeviceAnalyticsResponse,
  DeviceKind,
  DeviceRow,
  DeviceSortBy,
  DeviceSortDir,
  DeviceStatus,
} from "../pinia/types/devices.types";

const DashboardTableExportModal = defineAsyncComponent(
  () => import("../components/dashboard/DashboardTableExportModal.vue"),
);
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const {
  rows,
  loading,
  saving,
  error,
  total,
  page: storePage,
  pageSize: storePageSize,
  sortBy: storeSortBy,
  sortDir: storeSortDir,
  load,
  create,
  update,
  remove,
} = useDashboardDevicesPage();

const q = ref("");
const statusFilter = ref<DeviceStatus | "all">("all");
const kindFilter = ref<DeviceKind | "all">("all");
const sortBy = ref<DeviceSortBy>(storeSortBy.value || "updatedAt");
const sortDir = ref<DeviceSortDir>(storeSortDir.value || "desc");
const page = ref<number>(storePage.value || 1);
const pageSize = ref<number>(storePageSize.value || 10);
const editingId = ref<string | null>(null);
const tagsInput = ref("");
const analyticsLoading = ref(false);
const analyticsError = ref<string | null>(null);
const analyticsSnapshot = ref<DeviceAnalyticsResponse | null>(null);
const customerCriteria = ref<CustomerDeviceCriteria>(
  DevicesCustomerCriteriaService.load(),
);
const exporting = ref(false);
let analyticsRequestSequence = 0;
const ANALYTICS_DAYS_WINDOW = 30;
const ANALYTICS_TOP_LIMIT = 6;
const EXPORT_PAGE_SIZE = 50;
const EXPORT_MAX_PAGES = 400;
const EMPTY_EXPORT_VALUE = "—";
let hydratingFromRoute = false;

type DashboardTableExportDialogResult = {
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
};

const DEFAULT_EXPORT_COLUMN_KEYS = [
  ...DASHBOARD_DEVICES_EXPORT_COLUMN_KEYS,
] as DashboardDevicesExportColumnKey[];

const devicesExporter = new SpreadsheetExporter<
  DashboardDevicesExportRow,
  DashboardDevicesExportColumnKey,
  DashboardDevicesCsvBlueprint
>({
  fileNamePrefix: "dispositivos-dashboard",
  sheetName: "Dispositivos",
  defaultColumnKeys: DEFAULT_EXPORT_COLUMN_KEYS,
  buildBlueprint: (columnKeys) =>
    new DashboardDevicesCsvBlueprint({ columns: columnKeys }),
  columnWidthByKey: DASHBOARD_DEVICES_EXPORT_COLUMN_WIDTHS,
  centeredColumnKeys: DASHBOARD_DEVICES_EXPORT_CENTERED_COLUMNS,
  resolveCellStyle: ({ columnKey, record }) => {
    if (columnKey !== "status") return null;
    if (record.status === "Online") {
      return {
        fillColor: "FFECFDF5",
        fontColor: "FF166534",
        bold: true,
      };
    }
    if (record.status === "Manutenção") {
      return {
        fillColor: "FFFFF7ED",
        fontColor: "FF9A3412",
        bold: true,
      };
    }
    if (record.status === "Offline") {
      return {
        fillColor: "FFF1F5F9",
        fontColor: "FF475569",
      };
    }
    return null;
  },
});
const exportFlow = new TableExportFlowOrchestrator("DashboardDevicesPage");

const form = reactive<{
  name: string;
  kind: DeviceKind;
  status: DeviceStatus;
  vendor: string;
  model: string;
  operatingSystem: string;
  host: string;
  ipAddress: string;
  serialNumber: string;
}>({
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

const nameSuggestions = ref<string[]>([]);
const searchSuggestions = ref<string[]>([]);
const vendorSuggestions = ref<string[]>([]);
const modelSuggestions = ref<string[]>([]);
const hostSuggestions = ref<string[]>([]);
const serialSuggestions = ref<string[]>([]);

const searchAutocomplete = new SmartAutocompleteService(
  "devices-filter-search",
);
const nameAutocomplete = new SmartAutocompleteService("devices-form-name");
const vendorAutocomplete = new SmartAutocompleteService("devices-form-vendor");
const modelAutocomplete = new SmartAutocompleteService("devices-form-model");
const hostAutocomplete = new SmartAutocompleteService("devices-form-host");
const serialAutocomplete = new SmartAutocompleteService("devices-form-serial");
const formValidation = new FormValidationStateService({
  name: { required: true, normalize: (value) => String(value || "").trim() },
});
formValidation.hydrate({ name: form.name });

const updateSmartSuggestions = (
  value: string,
  service: SmartAutocompleteService,
  target: { value: string[] },
): void => {
  service.commit(value);
  target.value = service.suggest(value.trim());
};

const clearSmartSuggestions = (): void => {
  searchSuggestions.value = [];
  nameSuggestions.value = [];
  vendorSuggestions.value = [];
  modelSuggestions.value = [];
  hostSuggestions.value = [];
  serialSuggestions.value = [];
};

let listRequestTimer: ReturnType<typeof setTimeout> | null = null;
const clearListRequestTimer = (): void => {
  if (listRequestTimer !== null) {
    clearTimeout(listRequestTimer);
    listRequestTimer = null;
  }
};

const buildBaseFilterQuery = (): Pick<
  DeviceAnalyticsQuery,
  "q" | "status" | "kind"
> => ({
  q: q.value.trim() || undefined,
  status: statusFilter.value === "all" ? undefined : statusFilter.value,
  kind: kindFilter.value === "all" ? undefined : kindFilter.value,
});

const requestAnalyticsSnapshot = async (
  query: Pick<
    DeviceAnalyticsQuery,
    "q" | "status" | "kind"
  > = buildBaseFilterQuery(),
): Promise<void> => {
  const requestId = analyticsRequestSequence + 1;
  analyticsRequestSequence = requestId;
  analyticsLoading.value = true;
  analyticsError.value = null;
  try {
    const response = await ApiClientService.devices.analytics({
      ...query,
      days: ANALYTICS_DAYS_WINDOW,
      top: ANALYTICS_TOP_LIMIT,
    });
    if (requestId !== analyticsRequestSequence) {
      return;
    }
    analyticsSnapshot.value = response;
  } catch (caughtError) {
    if (requestId !== analyticsRequestSequence) {
      return;
    }
    analyticsSnapshot.value = null;
    analyticsError.value = "Nao foi possivel carregar os graficos.";
    console.error("[DashboardDevicesPage] analytics failed:", caughtError);
  } finally {
    if (requestId === analyticsRequestSequence) {
      analyticsLoading.value = false;
    }
  }
};

const requestServerList = (delayMs = 0, includeAnalytics = false): void => {
  clearListRequestTimer();
  const baseFilterQuery = buildBaseFilterQuery();
  const run = () => {
    void load({
      ...baseFilterQuery,
      page: page.value,
      pageSize: pageSize.value,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    });
    if (includeAnalytics) {
      void requestAnalyticsSnapshot(baseFilterQuery);
    }
  };

  if (delayMs > 0) {
    listRequestTimer = setTimeout(() => {
      run();
      listRequestTimer = null;
    }, delayMs);
    return;
  }

  run();
};

const buildRouteState = () => ({
  q: q.value,
  status: statusFilter.value,
  kind: kindFilter.value,
  page: page.value,
  pageSize: pageSize.value,
  sortBy: sortBy.value,
  sortDir: sortDir.value,
});

const applyRouteState = (query: typeof route.query): boolean => {
  const parsed = DeviceQueryStateService.fromQuery(query);
  const hasChanges =
    parsed.q !== q.value ||
    parsed.status !== statusFilter.value ||
    parsed.kind !== kindFilter.value ||
    parsed.page !== page.value ||
    parsed.pageSize !== pageSize.value ||
    parsed.sortBy !== sortBy.value ||
    parsed.sortDir !== sortDir.value;

  if (!hasChanges) {
    return false;
  }

  hydratingFromRoute = true;
  q.value = parsed.q;
  statusFilter.value = parsed.status;
  kindFilter.value = parsed.kind;
  page.value = parsed.page;
  pageSize.value = parsed.pageSize;
  sortBy.value = parsed.sortBy;
  sortDir.value = parsed.sortDir;
  hydratingFromRoute = false;
  return true;
};

const syncRouteQuery = (): void => {
  if (hydratingFromRoute) return;
  const state = buildRouteState();
  if (DeviceQueryStateService.isSameState(route.query, state)) {
    return;
  }
  const nextQuery = DeviceQueryStateService.toQuery(state);
  void router.replace({ query: nextQuery }).catch((caughtError) => {
    console.error(
      "[DashboardDevicesPage] failed to sync route query:",
      caughtError,
    );
  });
};

const handleCustomerCriteriaUpdated = (event: Event): void => {
  const customEvent = event as CustomEvent<CustomerDeviceCriteria>;
  customerCriteria.value = DevicesCustomerCriteriaService.save(
    customEvent.detail,
  );
};

onBeforeUnmount(() => {
  clearListRequestTimer();
  analyticsRequestSequence += 1;
  searchAutocomplete.cancel();
  nameAutocomplete.cancel();
  vendorAutocomplete.cancel();
  modelAutocomplete.cancel();
  hostAutocomplete.cancel();
  serialAutocomplete.cancel();
  if (typeof window !== "undefined") {
    window.removeEventListener(
      DEVICES_CUSTOMER_CRITERIA_UPDATED_EVENT,
      handleCustomerCriteriaUpdated,
    );
  }
});

const handleSearchInput = (): void => {
  updateSmartSuggestions(q.value, searchAutocomplete, searchSuggestions);
  page.value = 1;
  requestServerList(220, true);
};

const handleFilterChange = (): void => {
  page.value = 1;
  requestServerList(0, true);
};

const handleSortChange = (): void => {
  page.value = 1;
  requestServerList();
};

const handlePageSizeChange = (): void => {
  page.value = 1;
  requestServerList();
};

const goToPreviousPage = (): void => {
  if (page.value <= 1 || loading.value) {
    return;
  }
  page.value -= 1;
  requestServerList();
};

const goToNextPage = (): void => {
  if (loading.value || !hasNextPage.value) {
    return;
  }
  page.value += 1;
  requestServerList();
};
const handleNameInput = (): void => {
  formValidation.handleInput("name", form.name);
  updateSmartSuggestions(form.name, nameAutocomplete, nameSuggestions);
};
const handleNameBlur = (): void => {
  formValidation.markTouched("name");
};
const handleVendorInput = (): void =>
  updateSmartSuggestions(form.vendor, vendorAutocomplete, vendorSuggestions);
const handleModelInput = (): void =>
  updateSmartSuggestions(form.model, modelAutocomplete, modelSuggestions);
const handleHostInput = (): void =>
  updateSmartSuggestions(form.host, hostAutocomplete, hostSuggestions);
const handleSerialInput = (): void =>
  updateSmartSuggestions(
    form.serialNumber,
    serialAutocomplete,
    serialSuggestions,
  );

const parseTags = (raw: string): string[] =>
  raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const resetForm = (): void => {
  editingId.value = null;
  form.name = "";
  form.kind = "physical";
  form.status = "offline";
  form.vendor = "";
  form.model = "";
  form.operatingSystem = "";
  form.host = "";
  form.ipAddress = "";
  form.serialNumber = "";
  tagsInput.value = "";
  formValidation.hydrate({ name: form.name });
  clearSmartSuggestions();
};

const totalItems = computed(() => Math.max(0, Number(total.value || 0)));
const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalItems.value / Math.max(1, pageSize.value))),
);
const hasNextPage = computed(() => page.value < totalPages.value);

const stats = computed(() => {
  const analytics = analyticsSnapshot.value;
  if (analytics) {
    const total = Math.max(0, Number(analytics.total || 0));
    const online = Math.max(0, Number(analytics.status?.online || 0));
    const virtual = Math.max(0, Number(analytics.kind?.virtual || 0));
    return {
      total,
      online,
      physical: Math.max(0, total - virtual),
      virtual,
    };
  }

  const totalLocal = rows.value.length;
  const online = rows.value.filter((row) => row.status === "online").length;
  const virtual = rows.value.filter((row) => row.kind === "virtual").length;
  return {
    total: totalLocal,
    online,
    physical: totalLocal - virtual,
    virtual,
  };
});

const chartRows = computed<DeviceRow[]>(() => rows.value);
const chartDatasetTotal = computed(() =>
  Math.max(0, Number(analyticsSnapshot.value?.total ?? chartRows.value.length)),
);
const statusChartSlices = computed(() =>
  analyticsSnapshot.value
    ? DeviceAnalyticsService.statusSlicesFromTotals(
        analyticsSnapshot.value.status,
      )
    : DeviceAnalyticsService.statusSlices(chartRows.value),
);
const kindChartSlices = computed(() =>
  analyticsSnapshot.value
    ? DeviceAnalyticsService.kindSlicesFromTotals(analyticsSnapshot.value.kind)
    : DeviceAnalyticsService.kindSlices(chartRows.value),
);
const vendorChartBars = computed(() =>
  analyticsSnapshot.value
    ? DeviceAnalyticsService.barsFromEntries(
        analyticsSnapshot.value.topVendors,
        DeviceAnalyticsService.vendorPalette(),
      )
    : DeviceAnalyticsService.topVendors(chartRows.value, ANALYTICS_TOP_LIMIT),
);
const operatingSystemChartBars = computed(() =>
  analyticsSnapshot.value
    ? DeviceAnalyticsService.barsFromEntries(
        analyticsSnapshot.value.topOperatingSystems,
        DeviceAnalyticsService.osPalette(),
      )
    : DeviceAnalyticsService.topOperatingSystems(
        chartRows.value,
        ANALYTICS_TOP_LIMIT,
      ),
);
const tagChartBars = computed(() =>
  analyticsSnapshot.value
    ? DeviceAnalyticsService.barsFromEntries(
        analyticsSnapshot.value.topTags,
        DeviceAnalyticsService.tagPalette(),
      )
    : DeviceAnalyticsService.topTags(chartRows.value, ANALYTICS_TOP_LIMIT),
);
const activityChartBars = computed(() =>
  analyticsSnapshot.value
    ? DeviceAnalyticsService.activityByDayFromSeries(
        analyticsSnapshot.value.activityByDay,
      )
    : DeviceAnalyticsService.activityByDay(
        chartRows.value,
        ANALYTICS_DAYS_WINDOW,
      ),
);
const hasChartData = computed(
  () => chartDatasetTotal.value > 0 || chartRows.value.length > 0,
);
const userEmail = computed(() => {
  const email = authStore.me?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
});

const userEmailDomain = computed(() => {
  const email = userEmail.value;
  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex >= email.length - 1) {
    return "";
  }
  return email.slice(atIndex + 1);
});

const customerCriteriaLabel = computed(() => {
  const option = DevicesCustomerCriteriaService.options().find(
    (item) => item.value === customerCriteria.value,
  );
  return option?.label ?? "Mesmo domínio de e-mail";
});

const customerRows = computed<DeviceRow[]>(() => {
  const sourceRows = rows.value;
  const currentEmail = userEmail.value;
  const domain = userEmailDomain.value;

  if (!sourceRows.length || !currentEmail) {
    return [];
  }

  if (customerCriteria.value === "exclude-self") {
    return sourceRows.filter((row) => row.ownerEmail !== currentEmail);
  }

  if (!domain) {
    return [];
  }

  return sourceRows.filter((row) => {
    const ownerEmail = String(row.ownerEmail || "")
      .trim()
      .toLowerCase();
    const ownerDomain = ownerEmail.includes("@")
      ? ownerEmail.slice(ownerEmail.indexOf("@") + 1)
      : "";
    return ownerDomain === domain;
  });
});

const customerStats = computed(() => {
  const subset = customerRows.value;
  const total = subset.length;
  const online = subset.filter((row) => row.status === "online").length;
  const virtual = subset.filter((row) => row.kind === "virtual").length;
  return {
    total,
    online,
    virtual,
    physical: Math.max(0, total - virtual),
  };
});

const customerStatusChartSlices = computed(() =>
  DeviceAnalyticsService.statusSlices(customerRows.value),
);

const customerKindChartSlices = computed(() =>
  DeviceAnalyticsService.kindSlices(customerRows.value),
);

const customerVendorChartBars = computed(() =>
  DeviceAnalyticsService.topVendors(customerRows.value, ANALYTICS_TOP_LIMIT),
);

const customerRowsPreview = computed(() => customerRows.value.slice(0, 12));
const shouldRenderActivityTrend = computed(() =>
  DeviceAnalyticsService.shouldRenderTrend(activityChartBars.value, {
    minBars: 10,
    minNonZeroBars: 5,
  }),
);

watch(storePage, (value) => {
  if (typeof value === "number" && value > 0 && value !== page.value) {
    page.value = value;
  }
});

watch(storePageSize, (value) => {
  if (typeof value === "number" && value > 0 && value !== pageSize.value) {
    pageSize.value = value;
  }
});

watch(totalItems, () => {
  if (page.value > totalPages.value) {
    page.value = totalPages.value;
  }
});

watch([q, statusFilter, kindFilter, page, pageSize, sortBy, sortDir], () => {
  syncRouteQuery();
});

watch(
  () => route.query,
  (query) => {
    const changed = applyRouteState(query);
    if (changed) {
      requestServerList(0, true);
    }
  },
);

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener(
      DEVICES_CUSTOMER_CRITERIA_UPDATED_EVENT,
      handleCustomerCriteriaUpdated,
    );
  }
  applyRouteState(route.query);
  syncRouteQuery();
  requestServerList(0, true);
});

const statusLabelMap: Readonly<Record<DeviceStatus, string>> = Object.freeze({
  online: "Online",
  offline: "Offline",
  maintenance: "Manutenção",
});

const kindLabelMap: Readonly<Record<DeviceKind, string>> = Object.freeze({
  physical: "Físico",
  virtual: "Virtual",
});

const prettyDate = (value?: string): string => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("pt-BR");
};

const toExportValue = (value?: string): string => {
  if (typeof value !== "string") {
    return EMPTY_EXPORT_VALUE;
  }
  const normalized = value.trim();
  return normalized ? normalized : EMPTY_EXPORT_VALUE;
};

const normalizeExportRow = (item: any, index: number): DeviceRow | null => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const rawId = item.id ?? item._id;
  const id =
    typeof rawId === "string"
      ? rawId
      : rawId && typeof rawId.toString === "function"
        ? String(rawId.toString())
        : `export-device-${index}`;

  const kind = item.kind === "virtual" ? "virtual" : "physical";
  const status =
    item.status === "online" ||
    item.status === "maintenance" ||
    item.status === "offline"
      ? item.status
      : "offline";

  return {
    id,
    ownerEmail: String(item.ownerEmail || "").toLowerCase(),
    name: String(item.name || ""),
    kind,
    vendor: typeof item.vendor === "string" ? item.vendor : undefined,
    model: typeof item.model === "string" ? item.model : undefined,
    operatingSystem:
      typeof item.operatingSystem === "string"
        ? item.operatingSystem
        : undefined,
    host: typeof item.host === "string" ? item.host : undefined,
    ipAddress: typeof item.ipAddress === "string" ? item.ipAddress : undefined,
    serialNumber:
      typeof item.serialNumber === "string" ? item.serialNumber : undefined,
    status,
    tags: Array.isArray(item.tags)
      ? item.tags.filter((entry: unknown) => typeof entry === "string")
      : [],
    lastSeenAt:
      typeof item.lastSeenAt === "string" ? item.lastSeenAt : undefined,
    createdAt: String(item.createdAt || ""),
    updatedAt: String(item.updatedAt || ""),
  };
};

const fetchAllFilteredRowsForExport = async (): Promise<DeviceRow[]> => {
  const baseFilters = buildBaseFilterQuery();
  const firstPage = await ApiClientService.devices.list({
    ...baseFilters,
    page: 1,
    pageSize: EXPORT_PAGE_SIZE,
    sortBy: sortBy.value,
    sortDir: sortDir.value,
  });

  const rawRows: any[] = Array.isArray(firstPage?.items)
    ? [...firstPage.items]
    : [];
  const total = Number.isFinite(firstPage?.total)
    ? Math.max(0, Math.trunc(Number(firstPage.total)))
    : rawRows.length;
  const totalPages = Math.max(1, Math.ceil(total / EXPORT_PAGE_SIZE));
  const cappedPages = Math.min(totalPages, EXPORT_MAX_PAGES);

  for (let currentPage = 2; currentPage <= cappedPages; currentPage += 1) {
    const pageResult = await ApiClientService.devices.list({
      ...baseFilters,
      page: currentPage,
      pageSize: EXPORT_PAGE_SIZE,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    });
    if (Array.isArray(pageResult?.items) && pageResult.items.length > 0) {
      rawRows.push(...pageResult.items);
    }
  }

  if (totalPages > EXPORT_MAX_PAGES) {
    console.warn(
      `[DashboardDevicesPage] export capped at ${EXPORT_MAX_PAGES} pages`,
    );
  }

  const normalizedRows = rawRows
    .map((item, index) => normalizeExportRow(item, index))
    .filter((row): row is DeviceRow => !!row);
  const byId = new Map<string, DeviceRow>();
  normalizedRows.forEach((row) => {
    byId.set(row.id, row);
  });
  return [...byId.values()];
};

const buildExportRows = (
  sourceRows: readonly DeviceRow[],
): DashboardDevicesExportRow[] =>
  sourceRows.map((row) => ({
    nome: toExportValue(row.name),
    tipo: kindLabelMap[row.kind] || EMPTY_EXPORT_VALUE,
    status: statusLabelMap[row.status] || EMPTY_EXPORT_VALUE,
    fabricante: toExportValue(row.vendor),
    modelo: toExportValue(row.model),
    sistemaOperacional: toExportValue(row.operatingSystem),
    host: toExportValue(row.host),
    ip: toExportValue(row.ipAddress),
    serial: toExportValue(row.serialNumber),
    tags:
      Array.isArray(row.tags) && row.tags.length
        ? row.tags.join(", ")
        : EMPTY_EXPORT_VALUE,
    ultimaAtividade: prettyDate(row.lastSeenAt || row.updatedAt),
  }));

const openExportDialog =
  async (): Promise<DashboardTableExportDialogResult | null> =>
    ModalService.open<DashboardTableExportDialogResult>(
      DashboardTableExportModal,
      {
        title: "Exportar Dispositivos",
        size: "md",
        data: {
          presetKey: "dashboard.devices",
          totalRows: totalItems.value,
          entityLabel: "dispositivo(s)",
          columnOptions: DASHBOARD_DEVICES_EXPORT_COLUMNS,
          defaultColumnKeys: [...DEFAULT_EXPORT_COLUMN_KEYS],
          defaultFormats: ["csv", "xlsx"] as SpreadsheetExportFormat[],
        },
      },
    );

const handleOpenExportModal = async (): Promise<void> => {
  if (exporting.value) return;
  exporting.value = true;
  try {
    await exportFlow.execute({
      openDialog: openExportDialog,
      emptyStateMessage:
        "Não há dispositivos para exportar com os filtros selecionados.",
      buildRecords: async () => {
        const sourceRows = await fetchAllFilteredRowsForExport();
        return buildExportRows(sourceRows);
      },
      exportRecords: async (records, selection) =>
        devicesExporter.export(records, {
          formats: selection.formats,
          columnKeys: selection.columnKeys as DashboardDevicesExportColumnKey[],
        }),
    });
  } finally {
    exporting.value = false;
  }
};

const toPayload = () => ({
  name: form.name.trim(),
  kind: form.kind,
  status: form.status,
  vendor: form.vendor.trim() || undefined,
  model: form.model.trim() || undefined,
  operatingSystem: form.operatingSystem.trim() || undefined,
  host: form.host.trim() || undefined,
  ipAddress: form.ipAddress.trim() || undefined,
  serialNumber: form.serialNumber.trim() || undefined,
  tags: parseTags(tagsInput.value),
});

const commitSubmittedSmartValues = (): void => {
  nameAutocomplete.commitSubmitted(form.name);
  vendorAutocomplete.commitSubmitted(form.vendor);
  modelAutocomplete.commitSubmitted(form.model);
  hostAutocomplete.commitSubmitted(form.host);
  serialAutocomplete.commitSubmitted(form.serialNumber);
};

const submitForm = async (): Promise<void> => {
  const payload = toPayload();
  if (!payload.name) {
    formValidation.markSubmitted();
    await AlertService.error(
      "Validação",
      "O nome do dispositivo é obrigatório.",
    );
    return;
  }
  try {
    if (editingId.value) {
      await update(editingId.value, payload);
      await AlertService.success(
        "Dispositivo atualizado",
        "As informações foram salvas com sucesso.",
      );
    } else {
      await create(payload);
      await AlertService.success(
        "Dispositivo cadastrado",
        "Novo dispositivo registrado na sua lista.",
      );
    }
    commitSubmittedSmartValues();
    void requestAnalyticsSnapshot();
    resetForm();
  } catch (caughtError) {
    console.error("[DashboardDevicesPage] submit failed:", caughtError);
    await AlertService.error("Erro", "Não foi possível salvar o dispositivo.");
  }
};

const startEdit = (row: DeviceRow): void => {
  editingId.value = row.id;
  form.name = row.name;
  form.kind = row.kind;
  form.status = row.status;
  form.vendor = row.vendor || "";
  form.model = row.model || "";
  form.operatingSystem = row.operatingSystem || "";
  form.host = row.host || "";
  form.ipAddress = row.ipAddress || "";
  form.serialNumber = row.serialNumber || "";
  tagsInput.value = Array.isArray(row.tags) ? row.tags.join(", ") : "";
  formValidation.hydrate({ name: form.name });
};

const removeRow = async (row: DeviceRow): Promise<void> => {
  const confirmed = await AlertService.confirm(
    "Excluir dispositivo",
    `Deseja remover "${row.name}" da sua lista?`,
  );
  if (!confirmed) {
    return;
  }
  try {
    await remove(row.id);
    void requestAnalyticsSnapshot();
    if (editingId.value === row.id) {
      resetForm();
    }
    await AlertService.success("Removido", "Dispositivo removido com sucesso.");
  } catch (caughtError) {
    console.error("[DashboardDevicesPage] remove failed:", caughtError);
    await AlertService.error("Erro", "Não foi possível remover o dispositivo.");
  }
};

const refreshList = (): void => {
  requestServerList(0, true);
};
</script>

<template>
  <section class="devices-page" aria-label="Meus dispositivos">
    <header class="devices-header">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Meus dispositivos</h1>
        <p class="opacity-70">
          Gerencie seus dispositivos físicos e virtuais cadastrados no CRM.
        </p>
      </div>
      <div class="devices-header__actions">
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="loading"
          @click="refreshList"
        >
          Recarregar
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="loading || exporting || totalItems <= 0"
          @click="handleOpenExportModal"
        >
          {{ exporting ? "Exportando..." : "Exportar" }}
        </button>
      </div>
    </header>

    <section class="devices-stats" aria-label="Resumo dos dispositivos">
      <article class="card devices-stat">
        <span class="devices-stat__label">Total</span>
        <strong class="devices-stat__value">{{ stats.total }}</strong>
      </article>
      <article class="card devices-stat">
        <span class="devices-stat__label">Online</span>
        <strong class="devices-stat__value">{{ stats.online }}</strong>
      </article>
      <article class="card devices-stat">
        <span class="devices-stat__label">Virtuais</span>
        <strong class="devices-stat__value">{{ stats.virtual }}</strong>
      </article>
      <article class="card devices-stat">
        <span class="devices-stat__label">Físicos</span>
        <strong class="devices-stat__value">{{ stats.physical }}</strong>
      </article>
    </section>

    <section class="devices-charts" aria-label="Gráficos dos dispositivos">
      <article
        class="card devices-chart-card"
        aria-label="Distribuição por status"
      >
        <header class="devices-chart-card__head">
          <h2 class="text-lg font-bold">Status no Filtro</h2>
          <span class="devices-chart-card__meta"
            >{{ chartDatasetTotal }} itens</span
          >
        </header>
        <DonutChart
          v-if="hasChartData && statusChartSlices.length"
          :slices="statusChartSlices"
          :center-value="chartDatasetTotal"
          center-label="No filtro"
          :size="170"
          :stroke-width="26"
        />
        <p v-else class="devices-chart-empty">
          Sem dados para exibir distribuição por status.
        </p>
      </article>

      <article
        class="card devices-chart-card"
        aria-label="Distribuição por tipo"
      >
        <header class="devices-chart-card__head">
          <h2 class="text-lg font-bold">Tipos de Dispositivo</h2>
          <span class="devices-chart-card__meta">Físico x Virtual</span>
        </header>
        <DonutChart
          v-if="hasChartData && kindChartSlices.length"
          :slices="kindChartSlices"
          :center-value="chartDatasetTotal"
          center-label="Ativos no filtro"
          :size="170"
          :stroke-width="26"
        />
        <p v-else class="devices-chart-empty">
          Sem dados para exibir distribuição por tipo.
        </p>
      </article>

      <article
        class="card devices-chart-card devices-chart-card--ranking"
        aria-label="Fabricantes mais usados"
      >
        <header class="devices-chart-card__head">
          <h2 class="text-lg font-bold">Fabricantes Mais Registrados</h2>
          <span class="devices-chart-card__meta"
            >Top {{ ANALYTICS_TOP_LIMIT }} no filtro</span
          >
        </header>
        <BarChart
          v-if="hasChartData && vendorChartBars.length"
          :bars="vendorChartBars"
          :horizontal="true"
          :show-axis-labels="false"
          :show-values="true"
          :height="190"
          :max-bar-width="18"
        />
        <p v-else class="devices-chart-empty">
          Sem dados de fabricante para montar o ranking.
        </p>
      </article>

      <article
        class="card devices-chart-card devices-chart-card--ranking"
        aria-label="Sistemas operacionais mais usados"
      >
        <header class="devices-chart-card__head">
          <h2 class="text-lg font-bold">Sistemas Operacionais</h2>
          <span class="devices-chart-card__meta"
            >Top {{ ANALYTICS_TOP_LIMIT }} no filtro</span
          >
        </header>
        <BarChart
          v-if="hasChartData && operatingSystemChartBars.length"
          :bars="operatingSystemChartBars"
          :horizontal="true"
          :show-axis-labels="false"
          :show-values="true"
          :height="190"
          :max-bar-width="18"
        />
        <p v-else class="devices-chart-empty">
          Sem dados de sistema operacional para o filtro atual.
        </p>
      </article>

      <article
        class="card devices-chart-card devices-chart-card--ranking"
        aria-label="Tags mais frequentes"
      >
        <header class="devices-chart-card__head">
          <h2 class="text-lg font-bold">Tags Mais Frequentes</h2>
          <span class="devices-chart-card__meta"
            >Top {{ ANALYTICS_TOP_LIMIT }} no filtro</span
          >
        </header>
        <BarChart
          v-if="hasChartData && tagChartBars.length"
          :bars="tagChartBars"
          :horizontal="true"
          :show-axis-labels="false"
          :show-values="true"
          :height="190"
          :max-bar-width="18"
        />
        <p v-else class="devices-chart-empty">
          Sem tags suficientes para montar ranking.
        </p>
      </article>

      <article
        class="card devices-chart-card devices-chart-card--wide devices-chart-card--activity"
      >
        <header class="devices-chart-card__head">
          <h2 class="text-lg font-bold">
            Atividade nos Últimos {{ ANALYTICS_DAYS_WINDOW }} Dias
          </h2>
          <span class="devices-chart-card__meta"
            >Com base em ultimo update/seen</span
          >
        </header>
        <BarChart
          v-if="hasChartData && activityChartBars.length"
          :bars="activityChartBars"
          :show-axis-labels="true"
          :show-values="false"
          :height="210"
          :max-bar-width="16"
          :show-trend-line="shouldRenderActivityTrend"
          :show-trend-dots="false"
          :trend-line-width="1"
          trend-line-color="rgba(142,250,193,0.52)"
          default-color="#22c55e"
        />
        <p v-else class="devices-chart-empty">
          Sem dados de atividade para o período recente.
        </p>
      </article>

      <p v-if="analyticsLoading" class="devices-chart-footnote">
        Atualizando graficos agregados...
      </p>
      <p v-if="analyticsError" class="devices-error">
        {{ analyticsError }}
      </p>
    </section>

    <section class="card devices-filters" aria-label="Filtros de dispositivos">
      <fieldset class="devices-fieldset devices-fieldset--filters">
        <legend class="devices-legend">Filtragem rápida</legend>
        <div class="devices-filters__grid">
          <label class="devices-field">
            <span class="devices-label">Busca</span>
            <input
              v-model="q"
              class="table-search-input devices-smart-input devices-smart-input--search"
              type="search"
              :list="'devices-search-list'"
              autocomplete="section-devices search"
              placeholder="Nome, host, modelo, IP..."
              @input="handleSearchInput"
            />
            <datalist id="devices-search-list">
              <option
                v-for="option in searchSuggestions"
                :key="`device-search-${option}`"
                :value="option"
              />
            </datalist>
          </label>

          <label class="devices-field">
            <span class="devices-label">Status</span>
            <select
              v-model="statusFilter"
              class="table-search-input"
              @change="handleFilterChange"
            >
              <option value="all">Todos</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Manutenção</option>
            </select>
          </label>

          <label class="devices-field">
            <span class="devices-label">Tipo</span>
            <select
              v-model="kindFilter"
              class="table-search-input"
              @change="handleFilterChange"
            >
              <option value="all">Todos</option>
              <option value="physical">Físico</option>
              <option value="virtual">Virtual</option>
            </select>
          </label>
        </div>
      </fieldset>
    </section>

    <section
      class="card devices-form-card"
      aria-label="Formulário de dispositivo"
    >
      <header class="devices-form-card__head">
        <h2 class="text-lg font-bold">
          {{ editingId ? "Editar dispositivo" : "Novo dispositivo" }}
        </h2>
        <button
          v-if="editingId"
          class="btn btn-ghost btn-sm"
          type="button"
          @click="resetForm"
        >
          Cancelar edição
        </button>
      </header>

      <form class="devices-form" @submit.prevent="submitForm">
        <fieldset class="devices-fieldset">
          <legend class="devices-legend">Identificação</legend>
          <div class="devices-form-grid">
            <label class="devices-field">
              <span class="devices-label">Nome</span>
              <input
                v-model="form.name"
                class="table-search-input devices-smart-input devices-smart-input--name devices-name-input devices-validated-input"
                :class="formValidation.classMap('name', form.name)"
                :list="'devices-name-list'"
                autocomplete="section-devices name"
                placeholder="Notebook de suporte"
                required
                @input="handleNameInput"
                @blur="handleNameBlur"
              />
              <datalist id="devices-name-list">
                <option
                  v-for="option in nameSuggestions"
                  :key="`device-name-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <label class="devices-field">
              <span class="devices-label">Tipo</span>
              <select v-model="form.kind" class="table-search-input">
                <option value="physical">Físico</option>
                <option value="virtual">Virtual</option>
              </select>
            </label>

            <label class="devices-field">
              <span class="devices-label">Status</span>
              <select v-model="form.status" class="table-search-input">
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Manutenção</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset class="devices-fieldset">
          <legend class="devices-legend">Plataforma</legend>
          <div class="devices-form-grid">
            <label class="devices-field">
              <span class="devices-label">Fabricante</span>
              <input
                v-model="form.vendor"
                class="table-search-input devices-smart-input devices-smart-input--vendor"
                :list="'devices-vendor-list'"
                autocomplete="section-devices organization"
                placeholder="Dell"
                @input="handleVendorInput"
              />
              <datalist id="devices-vendor-list">
                <option
                  v-for="option in vendorSuggestions"
                  :key="`device-vendor-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <label class="devices-field">
              <span class="devices-label">Modelo</span>
              <input
                v-model="form.model"
                class="table-search-input devices-smart-input devices-smart-input--model"
                :list="'devices-model-list'"
                autocomplete="section-devices organization-title"
                placeholder="Latitude 7440"
                @input="handleModelInput"
              />
              <datalist id="devices-model-list">
                <option
                  v-for="option in modelSuggestions"
                  :key="`device-model-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <label class="devices-field">
              <span class="devices-label">Sistema Operacional</span>
              <input
                v-model="form.operatingSystem"
                class="table-search-input devices-smart-input devices-smart-input--os"
                autocomplete="off"
                placeholder="Windows 11 Pro"
              />
            </label>
          </div>
        </fieldset>

        <fieldset class="devices-fieldset">
          <legend class="devices-legend">Rede e Inventário</legend>
          <div class="devices-form-grid">
            <label class="devices-field">
              <span class="devices-label">Host</span>
              <input
                v-model="form.host"
                class="table-search-input devices-smart-input devices-smart-input--host"
                :list="'devices-host-list'"
                autocomplete="section-devices url"
                placeholder="ws-001"
                @input="handleHostInput"
              />
              <datalist id="devices-host-list">
                <option
                  v-for="option in hostSuggestions"
                  :key="`device-host-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <label class="devices-field">
              <span class="devices-label">IP</span>
              <input
                v-model="form.ipAddress"
                class="table-search-input devices-smart-input devices-smart-input--ip"
                inputmode="decimal"
                placeholder="10.20.1.10"
                autocomplete="off"
              />
            </label>

            <label class="devices-field">
              <span class="devices-label">Serial</span>
              <input
                v-model="form.serialNumber"
                class="table-search-input devices-smart-input devices-smart-input--serial"
                :list="'devices-serial-list'"
                autocomplete="section-devices one-time-code"
                placeholder="SN-ABC123"
                @input="handleSerialInput"
              />
              <datalist id="devices-serial-list">
                <option
                  v-for="option in serialSuggestions"
                  :key="`device-serial-${option}`"
                  :value="option"
                />
              </datalist>
            </label>
          </div>
        </fieldset>

        <fieldset class="devices-fieldset">
          <legend class="devices-legend">Classificação</legend>
          <label class="devices-field devices-field--full">
            <span class="devices-label">Tags</span>
            <input
              v-model="tagsInput"
              class="table-search-input devices-smart-input devices-smart-input--tags"
              autocomplete="off"
              placeholder="workstation, suporte, campo"
            />
          </label>
        </fieldset>

        <div class="devices-form-actions">
          <button class="btn btn-primary" type="submit" :disabled="saving">
            {{ editingId ? "Salvar alterações" : "Cadastrar dispositivo" }}
          </button>
        </div>
      </form>
    </section>

    <section
      class="card devices-table-card"
      aria-label="Tabela de dispositivos"
    >
      <header class="devices-table-card__head">
        <h2 class="text-lg font-bold">Dispositivos registrados</h2>
        <div class="devices-table-summary">
          <span class="text-sm opacity-70">
            {{ rows.length }} de {{ totalItems }} itens
          </span>
          <span class="text-sm opacity-70">
            Página {{ page }} de {{ totalPages }}
          </span>
        </div>
      </header>

      <div class="devices-table-controls">
        <label class="devices-field">
          <span class="devices-label">Ordenar por</span>
          <select
            v-model="sortBy"
            class="table-search-input"
            @change="handleSortChange"
          >
            <option value="updatedAt">Atualização</option>
            <option value="lastSeenAt">Último acesso</option>
            <option value="name">Nome</option>
            <option value="status">Status</option>
            <option value="kind">Tipo</option>
            <option value="vendor">Fabricante</option>
          </select>
        </label>

        <label class="devices-field">
          <span class="devices-label">Direção</span>
          <select
            v-model="sortDir"
            class="table-search-input"
            @change="handleSortChange"
          >
            <option value="desc">Mais recente</option>
            <option value="asc">Mais antigo</option>
          </select>
        </label>

        <label class="devices-field">
          <span class="devices-label">Itens por página</span>
          <select
            v-model.number="pageSize"
            class="table-search-input"
            @change="handlePageSizeChange"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </label>

        <div
          class="devices-pagination"
          role="navigation"
          aria-label="Paginação de dispositivos"
        >
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="loading || page <= 1"
            @click="goToPreviousPage"
          >
            Anterior
          </button>
          <span class="text-sm opacity-70">{{ page }} / {{ totalPages }}</span>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="loading || !hasNextPage"
            @click="goToNextPage"
          >
            Próxima
          </button>
        </div>
      </div>

      <div
        class="devices-table-wrap"
        role="region"
        aria-label="Lista de dispositivos"
      >
        <table class="devices-table" role="table" aria-label="Dispositivos">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Host / IP</th>
              <th>Modelo</th>
              <th>Última atividade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>
                <div class="devices-name-cell">
                  <strong>{{ row.name }}</strong>
                  <small class="opacity-70">{{ row.ownerEmail }}</small>
                </div>
              </td>
              <td>{{ kindLabelMap[row.kind] }}</td>
              <td>
                <span class="devices-status" :data-status="row.status">
                  {{ statusLabelMap[row.status] }}
                </span>
              </td>
              <td>{{ row.host || "—" }} / {{ row.ipAddress || "—" }}</td>
              <td>
                {{ row.vendor || "—" }}
                <span v-if="row.model">· {{ row.model }}</span>
              </td>
              <td>{{ prettyDate(row.lastSeenAt || row.updatedAt) }}</td>
              <td class="devices-actions">
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  @click="startEdit(row)"
                >
                  Editar
                </button>
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  @click="removeRow(row)"
                >
                  Excluir
                </button>
              </td>
            </tr>

            <tr v-if="!loading && !rows.length">
              <td colspan="7" class="devices-empty">
                Nenhum dispositivo encontrado para os filtros atuais.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section
      class="card devices-customers"
      aria-label="Dispositivos de clientes"
      data-testid="devices-customers-section"
    >
      <header class="devices-customers__head">
        <div class="grid gap-1">
          <h2 class="text-lg font-bold">Dispositivos de clientes</h2>
          <p class="opacity-70">
            Critério atual: <strong>{{ customerCriteriaLabel }}</strong>
          </p>
        </div>
        <RouterLink class="btn btn-ghost btn-sm" to="/dashboard/settings">
          Configurar critério
        </RouterLink>
      </header>

      <section
        class="devices-customers__stats"
        aria-label="Resumo de dispositivos de clientes"
      >
        <article class="devices-customer-stat">
          <span class="devices-customer-stat__label">Total</span>
          <strong class="devices-customer-stat__value">{{
            customerStats.total
          }}</strong>
        </article>
        <article class="devices-customer-stat">
          <span class="devices-customer-stat__label">Online</span>
          <strong class="devices-customer-stat__value">{{
            customerStats.online
          }}</strong>
        </article>
        <article class="devices-customer-stat">
          <span class="devices-customer-stat__label">Virtuais</span>
          <strong class="devices-customer-stat__value">{{
            customerStats.virtual
          }}</strong>
        </article>
        <article class="devices-customer-stat">
          <span class="devices-customer-stat__label">Físicos</span>
          <strong class="devices-customer-stat__value">{{
            customerStats.physical
          }}</strong>
        </article>
      </section>

      <section
        class="devices-customers__charts"
        aria-label="Gráficos de dispositivos de clientes"
      >
        <article class="devices-customers-chart-card">
          <h3 class="text-base font-bold">Status</h3>
          <DonutChart
            v-if="customerRows.length && customerStatusChartSlices.length"
            :slices="customerStatusChartSlices"
            :center-value="customerStats.total"
            center-label="Clientes"
            :size="160"
            :stroke-width="24"
          />
          <p v-else class="devices-chart-empty">
            Sem dados de status para clientes.
          </p>
        </article>

        <article class="devices-customers-chart-card">
          <h3 class="text-base font-bold">Tipos</h3>
          <DonutChart
            v-if="customerRows.length && customerKindChartSlices.length"
            :slices="customerKindChartSlices"
            :center-value="customerStats.total"
            center-label="Clientes"
            :size="160"
            :stroke-width="24"
          />
          <p v-else class="devices-chart-empty">
            Sem dados de tipo para clientes.
          </p>
        </article>

        <article
          class="devices-customers-chart-card devices-customers-chart-card--wide"
        >
          <h3 class="text-base font-bold">Fabricantes mais frequentes</h3>
          <BarChart
            v-if="customerRows.length && customerVendorChartBars.length"
            :bars="customerVendorChartBars"
            :horizontal="true"
            :show-axis-labels="false"
            :show-values="true"
            :height="180"
            :max-bar-width="18"
          />
          <p v-else class="devices-chart-empty">
            Sem dados de fabricante para clientes.
          </p>
        </article>
      </section>

      <div
        class="devices-customers__table-wrap"
        role="region"
        aria-label="Tabela de dispositivos de clientes"
      >
        <table
          class="devices-table"
          role="table"
          aria-label="Dispositivos de clientes"
        >
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail dono</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Host / IP</th>
              <th>Última atividade</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in customerRowsPreview"
              :key="`customer-device-${row.id}`"
            >
              <td>{{ row.name }}</td>
              <td>{{ row.ownerEmail }}</td>
              <td>{{ kindLabelMap[row.kind] }}</td>
              <td>
                <span class="devices-status" :data-status="row.status">
                  {{ statusLabelMap[row.status] }}
                </span>
              </td>
              <td>{{ row.host || "—" }} / {{ row.ipAddress || "—" }}</td>
              <td>{{ prettyDate(row.lastSeenAt || row.updatedAt) }}</td>
            </tr>

            <tr v-if="!customerRowsPreview.length">
              <td colspan="6" class="devices-empty">
                Nenhum dispositivo de cliente encontrado com o critério atual.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="loading" class="devices-footnote">Carregando dispositivos...</p>
    <p v-if="error" class="devices-error">{{ error }}</p>
  </section>
</template>

<style scoped lang="scss">
.devices-page {
  display: grid;
  gap: 1rem;

  --devices-input-icon-size: 0.95rem;
  --devices-input-icon-x: 0.68rem;
  --devices-icon-search: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0'/%3E%3C/svg%3E");
  --devices-icon-info: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16'/%3E%3Cpath d='m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0'/%3E%3C/svg%3E");
  --devices-icon-router: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M5.525 3.025a3.5 3.5 0 0 1 4.95 0 .5.5 0 1 0 .707-.707 4.5 4.5 0 0 0-6.364 0 .5.5 0 0 0 .707.707'/%3E%3Cpath d='M6.94 4.44a1.5 1.5 0 0 1 2.12 0 .5.5 0 0 0 .708-.708 2.5 2.5 0 0 0-3.536 0 .5.5 0 0 0 .707.707ZM2.5 11a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m4.5-.5a.5.5 0 1 0 1 0 .5.5 0 0 0-1 0m2.5.5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m1.5-.5a.5.5 0 1 0 1 0 .5.5 0 0 0-1 0m2 0a.5.5 0 1 0 1 0 .5.5 0 0 0-1 0'/%3E%3Cpath d='M2.974 2.342a.5.5 0 1 0-.948.316L3.806 8H1.5A1.5 1.5 0 0 0 0 9.5v2A1.5 1.5 0 0 0 1.5 13H2a.5.5 0 0 0 .5.5h2A.5.5 0 0 0 5 13h6a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5h.5a1.5 1.5 0 0 0 1.5-1.5v-2A1.5 1.5 0 0 0 14.5 8h-2.306l1.78-5.342a.5.5 0 1 0-.948-.316L11.14 8H4.86zM14.5 9a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5z'/%3E%3Cpath d='M8.5 5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0'/%3E%3C/svg%3E");
  --devices-icon-gear: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M7.068.727c.243-.97 1.62-.97 1.864 0l.071.286a.96.96 0 0 0 1.622.434l.205-.211c.695-.719 1.888-.03 1.613.931l-.08.284a.96.96 0 0 0 1.187 1.187l.283-.081c.96-.275 1.65.918.931 1.613l-.211.205a.96.96 0 0 0 .434 1.622l.286.071c.97.243.97 1.62 0 1.864l-.286.071a.96.96 0 0 0-.434 1.622l.211.205c.719.695.03 1.888-.931 1.613l-.284-.08a.96.96 0 0 0-1.187 1.187l.081.283c.275.96-.918 1.65-1.613.931l-.205-.211a.96.96 0 0 0-1.622.434l-.071.286c-.243.97-1.62.97-1.864 0l-.071-.286a.96.96 0 0 0-1.622-.434l-.205.211c-.695.719-1.888.03-1.613-.931l.08-.284a.96.96 0 0 0-1.186-1.187l-.284.081c-.96.275-1.65-.918-.931-1.613l.211-.205a.96.96 0 0 0-.434-1.622l-.286-.071c-.97-.243-.97-1.62 0-1.864l.286-.071a.96.96 0 0 0 .434-1.622l-.211-.205c-.719-.695-.03-1.888.931-1.613l.284.08a.96.96 0 0 0 1.187-1.186l-.081-.284c-.275-.96.918-1.65 1.613-.931l.205.211a.96.96 0 0 0 1.622-.434zM12.973 8.5H8.25l-2.834 3.779A4.998 4.998 0 0 0 12.973 8.5m0-1a4.998 4.998 0 0 0-7.557-3.779l2.834 3.78zM5.048 3.967l-.087.065zm-.431.355A4.98 4.98 0 0 0 3.002 8c0 1.455.622 2.765 1.615 3.678L7.375 8zm.344 7.646.087.065z'/%3E%3C/svg%3E");
}

.devices-header {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  justify-content: space-between;
}

.devices-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.devices-stats {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.devices-charts {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(17.5rem, 1fr));
}

.devices-stat {
  border: 1px solid var(--border-1);
  display: grid;
  gap: 0.2rem;
  padding: 0.9rem;
}

.devices-stat__label {
  font-size: 0.75rem;
  opacity: 0.7;
  text-transform: uppercase;
}

.devices-stat__value {
  font-size: 1.45rem;
}

.devices-chart-card {
  display: grid;
  gap: 0.75rem;
  min-height: 15.5rem;
  padding: 1.08rem 1.15rem 1.15rem 2.3rem;
}

.devices-chart-card__head {
  align-items: baseline;
  display: flex;
  gap: 0.6rem;
  justify-content: space-between;
}

.devices-chart-card__meta {
  font-size: 0.72rem;
  opacity: 0.72;
}

.devices-chart-card--wide {
  grid-column: 1 / -1;
  min-height: 15rem;
}

.devices-chart-empty {
  color: var(--text-3);
  font-size: 0.85rem;
  margin: 0.2rem 0 0;
}

.devices-chart-card--ranking {
  min-height: 16.2rem;

  :deep(.bar-chart--horizontal .bar-item) {
    gap: 0.55rem;
  }

  :deep(.bar-chart--horizontal .bar-label) {
    min-width: 6.6rem;
    text-align: left;
  }

  :deep(.bar-chart--horizontal .bar-container) {
    height: 1.12rem;
  }
}

.devices-chart-card--activity {
  min-height: 16.8rem;

  :deep(.bar-chart:not(.bar-chart--horizontal) .bar-label) {
    font-size: 0.66rem;
  }
}

.devices-chart-footnote {
  color: var(--text-3);
  font-size: 0.78rem;
  margin: -0.2rem 0 0;
}

.devices-filters {
  padding: 1.1rem;
}

.devices-filters__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.devices-form-card {
  display: grid;
  gap: 1.15rem;
  padding: 1.15rem;
}

.devices-form-card__head {
  align-items: center;
  display: flex;
  gap: 0.65rem;
  justify-content: space-between;
}

.devices-form {
  display: grid;
  gap: 1.2rem;
}

.devices-fieldset {
  border: 1px solid color-mix(in oklab, var(--border-1) 82%, transparent);
  border-radius: 0.75rem;
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 1rem;
  background: color-mix(in oklab, var(--surface-2) 35%, transparent);
}

.devices-legend {
  color: var(--text-2);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.035em;
  padding: 0 0.3rem;
  text-transform: uppercase;
}

.devices-label {
  color: var(--text-2);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.015em;
}

.devices-field {
  display: grid;
  gap: 0.48rem;
}

.devices-form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.devices-smart-input {
  padding-inline-start: calc(
    var(--devices-input-icon-x) + var(--devices-input-icon-size) + 0.56rem
  );
  background-repeat: no-repeat;
  background-position: var(--devices-input-icon-x) center;
  background-size: var(--devices-input-icon-size) var(--devices-input-icon-size);
}

.devices-smart-input--search {
  background-image: var(--devices-icon-search);
}

.devices-smart-input--name,
.devices-smart-input--vendor,
.devices-smart-input--serial,
.devices-smart-input--tags {
  background-image: var(--devices-icon-info);
}

.devices-smart-input--model,
.devices-smart-input--os {
  background-image: var(--devices-icon-gear);
}

.devices-smart-input--host,
.devices-smart-input--ip {
  background-image: var(--devices-icon-router);
}

.devices-validated-input.is-untouched:invalid,
.devices-validated-input.is-pristine:invalid,
.devices-validated-input.is-untouched:valid,
.devices-validated-input.is-pristine:valid {
  border-color: var(--border-2);
}

.devices-validated-input.is-invalid {
  border-color: color-mix(in oklab, #ef4444 65%, transparent);
}

.devices-validated-input.is-valid {
  border-color: color-mix(in oklab, #22c55e 55%, transparent);
}

.devices-field--full {
  grid-column: 1 / -1;
}

.devices-form-actions {
  display: flex;
  margin-top: 0.2rem;
  justify-content: flex-end;
}

.devices-table-card {
  display: grid;
  gap: 0.8rem;
  padding: 1rem 2rem;
}

.devices-table-card__head {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;
  justify-content: space-between;
}

.devices-table-summary {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.devices-table-controls {
  align-items: end;
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(3, minmax(9.2rem, 1fr)) auto;
}

.devices-pagination {
  align-items: center;
  display: flex;
  gap: 0.55rem;
  justify-content: flex-end;
}

.devices-table-wrap {
  overflow: auto;
}

.devices-table {
  border-collapse: collapse;
  min-width: 860px;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid var(--border-1);
    font-size: 0.83rem;
    padding: 0.6rem;
    text-align: left;
    vertical-align: middle;
  }

  th {
    font-size: 0.7rem;
    letter-spacing: 0.02em;
    opacity: 0.8;
    text-transform: uppercase;
  }
}

.devices-name-cell {
  display: grid;
  gap: 0.05rem;
}

.devices-status {
  border: 1px solid color-mix(in oklab, var(--border-1) 60%, transparent);
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  text-transform: uppercase;

  &[data-status="online"] {
    color: #22c55e;
  }

  &[data-status="offline"] {
    color: #64748b;
  }

  &[data-status="maintenance"] {
    color: #f59e0b;
  }
}

.devices-actions {
  display: flex;
  gap: 0.45rem;
}

.devices-empty {
  opacity: 0.7;
  padding: 1rem;
  text-align: center;
}

.devices-footnote {
  font-size: 0.82rem;
  opacity: 0.7;
}

.devices-customers {
  display: grid;
  gap: 0.9rem;
  padding: 1rem 2rem;
}

.devices-customers__head {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: space-between;
}

.devices-customers__stats {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
}

.devices-customer-stat {
  border: 1px solid var(--border-1);
  border-radius: 0.7rem;
  display: grid;
  gap: 0.2rem;
  padding: 0.75rem;
}

.devices-customer-stat__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  opacity: 0.72;
  text-transform: uppercase;
}

.devices-customer-stat__value {
  font-size: 1.25rem;
}

.devices-customers__charts {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.devices-customers-chart-card {
  border: 1px solid var(--border-1);
  border-radius: 0.7rem;
  display: grid;
  gap: 0.6rem;
  min-height: 13.5rem;
  padding: 0.85rem;
}

.devices-customers-chart-card--wide {
  grid-column: 1 / -1;
}

.devices-customers__table-wrap {
  overflow: auto;
}

.devices-error {
  color: #ef4444;
  font-weight: 600;
}

@media (max-width: 960px) {
  .devices-form-card__head,
  .devices-table-card__head,
  .devices-chart-card__head,
  .devices-customers__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .devices-fieldset {
    padding: 0.75rem;
  }

  .devices-form-actions {
    justify-content: stretch;

    .btn {
      width: 100%;
    }
  }

  .devices-table-controls {
    grid-template-columns: 1fr;
  }

  .devices-pagination {
    justify-content: flex-start;
  }
}
</style>
