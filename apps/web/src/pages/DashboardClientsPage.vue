<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  ref,
  watch,
} from "vue";
import type * as XLSXTypes from "xlsx-js-style";
import { useDashboardClientsPage } from "../assets/scripts/pages/useDashboardClientsPage";
import { useClientQuery } from "../composables/useClientQuery";
import ModalService from "../services/ModalService";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";
import TableExportFlowOrchestrator from "../services/TableExportFlowOrchestrator";
import { useProjectsStore } from "../pinia/stores/projects.store";
import { useLeadsStore } from "../pinia/stores/leads.store";
import type { ClientRow } from "../pinia/types/clients.types";
import type { ProjectRow } from "../pinia/types/projects.types";
import type { LeadRow } from "../pinia/types/leads.types";
import {
  CsvDocumentBuilder,
  DASHBOARD_CLIENTS_EXPORT_COLUMN_KEYS,
  DashboardClientsCsvBlueprint,
  type DashboardClientsExportColumnKey,
  type DashboardClientsExportRow,
} from "../utils/export";
import { ACTION_TITLES, TABLE_TITLES } from "../utils/constants/dom-titles";
import {
  TABLE_DATA_ATTRS,
  CLIENT_DATA_ATTRS,
  TEST_DATA_ATTRS,
} from "../utils/constants/dom-data-attrs";
import {
  CLIENTS_LIFECYCLE_UNKNOWN_LABEL,
  CLIENT_LIFECYCLE_EXPANSION_MIN_ENGAGEMENT,
  CLIENT_LIFECYCLE_EXPANSION_MIN_PROJECTS,
  CLIENT_LIFECYCLE_INACTIVE_MAX_ENGAGEMENT,
  CLIENT_LIFECYCLE_INACTIVE_MIN_AGE_DAYS,
  CLIENT_LIFECYCLE_RISK_MAX_ENGAGEMENT,
  DASHBOARD_CLIENTS_EXPORT_COLORS,
  DASHBOARD_CLIENTS_EXPORT_COLUMN_WIDTH_BY_KEY,
  DASHBOARD_CLIENTS_EXPORT_LIFECYCLE_STAGES,
  EMAIL_ENGAGEMENT_WEIGHTS,
  LIFECYCLE_CLASS_BY_STAGE,
  LIFECYCLE_SORT_ORDER,
  WHATSAPP_ENGAGEMENT_WEIGHTS,
  type ClientLifecycleStage,
} from "../utils/constants/dashboard-clients.constants";

const { rows, loading, syncing, error, load } = useDashboardClientsPage();
const projectsStore = useProjectsStore();
const leadsStore = useLeadsStore();
const { selectedClientId, setClientQuery, clearClientQuery } = useClientQuery();

const expandedClientId = ref<string | null>(null);
const TABLE_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const tablePageSize = ref<(typeof TABLE_PAGE_SIZE_OPTIONS)[number]>(50);
const tablePage = ref(1);
const tableContainerRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const pendingLoads: Promise<unknown>[] = [];
  if (!projectsStore.rows.length) {
    pendingLoads.push(projectsStore.list());
  }
  if (!leadsStore.rows.length) {
    pendingLoads.push(leadsStore.list());
  }

  if (selectedClientId.value) {
    expandedClientId.value = selectedClientId.value;
  }

  if (pendingLoads.length) {
    void Promise.all(pendingLoads).catch((error) => {
      console.error("[DashboardClientsPage] background preload failed:", error);
    });
  }
});

const toggleClientExpand = async (clientId: string) => {
  if (expandedClientId.value === clientId) {
    expandedClientId.value = null;
    await clearClientQuery();
  } else {
    expandedClientId.value = clientId;
    await setClientQuery(clientId);
  }
};

const resolveClientPage = (clientId: string): number | null => {
  const clientIndex = sortedRows.value.findIndex((row) => row.id === clientId);
  if (clientIndex < 0) {
    return null;
  }
  return Math.floor(clientIndex / tablePageSize.value) + 1;
};

const ensureClientPageVisible = async (clientId: string): Promise<void> => {
  const targetPage = resolveClientPage(clientId);
  if (!targetPage || tablePage.value === targetPage) {
    return;
  }
  tablePage.value = targetPage;
  await nextTick();
};

const handleSelectClientFromHighlights = async (clientId: string) => {
  expandedClientId.value = clientId;
  await ensureClientPageVisible(clientId);
  await setClientQuery(clientId);

  const element = document.getElementById(`client-row-${clientId}`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

const sortKey = ref<
  | "name"
  | "type"
  | "company"
  | "cnpj"
  | "cep"
  | "lifecycle"
  | "email"
  | "phone"
  | "whatsapp"
>("name");
const sortDir = ref<"asc" | "desc">("asc");

const safeRows = computed(
  () => (rows.value || []).filter(Boolean) as ClientRow[],
);
const safeProjects = computed(
  () => (projectsStore.rows || []).filter(Boolean) as ProjectRow[],
);
const safeLeads = computed(
  () => (leadsStore.rows || []).filter(Boolean) as LeadRow[],
);

type EngagementAnalyticsMap = Readonly<Record<string, number | undefined>>;

const projectCountByClient = computed(() => {
  const result = new Map<string, number>();
  for (const project of safeProjects.value) {
    const clientId = project.clientId;
    if (!clientId) continue;
    result.set(clientId, (result.get(clientId) ?? 0) + 1);
  }
  return result;
});

const toSafePositive = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
};

const calculateWeightedEngagementScore = (
  analytics: EngagementAnalyticsMap | undefined,
  weights: Readonly<Record<string, number>>,
): number => {
  if (!analytics) return 0;
  const sent = toSafePositive(analytics.sent);
  if (sent <= 0) return 0;

  let weightedScore = 0;
  for (const [metric, weight] of Object.entries(weights)) {
    const metricValue = toSafePositive(analytics[metric]);
    weightedScore += (metricValue / sent) * weight;
  }

  return Math.min(100, Math.round(weightedScore));
};

type ClientMetrics = {
  projectCount: number;
  whatsappScore: number;
  emailScore: number;
  combinedEngagement: number;
  lifecycleStage: ClientLifecycleStage;
  lifecycleClass: string;
};

const resolveClientLifecycleStage = (
  projectCount: number,
  combinedEngagement: number,
  ageInDays: number,
): ClientLifecycleStage => {
  if (
    projectCount === 0 &&
    combinedEngagement < CLIENT_LIFECYCLE_INACTIVE_MAX_ENGAGEMENT &&
    ageInDays > CLIENT_LIFECYCLE_INACTIVE_MIN_AGE_DAYS
  ) {
    return "Inativo";
  }

  if (projectCount === 0) {
    return "Prospect";
  }

  if (
    projectCount >= CLIENT_LIFECYCLE_EXPANSION_MIN_PROJECTS &&
    combinedEngagement >= CLIENT_LIFECYCLE_EXPANSION_MIN_ENGAGEMENT
  ) {
    return "Expansão";
  }

  if (combinedEngagement < CLIENT_LIFECYCLE_RISK_MAX_ENGAGEMENT) {
    return "Em Risco";
  }

  return "Ativo";
};

const clientMetricsById = computed(() => {
  const metricsById = new Map<string, ClientMetrics>();
  const now = Date.now();

  for (const client of safeRows.value) {
    const projectCount = projectCountByClient.value.get(client.id) ?? 0;
    const whatsappScore = calculateWeightedEngagementScore(
      client.whatsappAnalytics as EngagementAnalyticsMap | undefined,
      WHATSAPP_ENGAGEMENT_WEIGHTS,
    );
    const emailScore = calculateWeightedEngagementScore(
      client.emailAnalytics as EngagementAnalyticsMap | undefined,
      EMAIL_ENGAGEMENT_WEIGHTS,
    );
    const combinedEngagement = Math.round((whatsappScore + emailScore) / 2);
    const createdAtMs = Date.parse(client.createdAt);
    const ageInDays = Number.isFinite(createdAtMs)
      ? Math.floor((now - createdAtMs) / (1000 * 60 * 60 * 24))
      : 0;
    const lifecycleStage = resolveClientLifecycleStage(
      projectCount,
      combinedEngagement,
      ageInDays,
    );

    metricsById.set(client.id, {
      projectCount,
      whatsappScore,
      emailScore,
      combinedEngagement,
      lifecycleStage,
      lifecycleClass:
        LIFECYCLE_CLASS_BY_STAGE[lifecycleStage] ??
        LIFECYCLE_CLASS_BY_STAGE.Inativo,
    });
  }

  return metricsById;
});

const resolveClientMetrics = (client: ClientRow): ClientMetrics =>
  clientMetricsById.value.get(client.id) ?? {
    projectCount: 0,
    whatsappScore: 0,
    emailScore: 0,
    combinedEngagement: 0,
    lifecycleStage: CLIENTS_LIFECYCLE_UNKNOWN_LABEL as ClientLifecycleStage,
    lifecycleClass: LIFECYCLE_CLASS_BY_STAGE.Inativo,
  };

const getClientProjectCount = (clientId: string): number =>
  clientMetricsById.value.get(clientId)?.projectCount ?? 0;

const getClientTypeLabel = (client: ClientRow): string =>
  client.type === "empresa" ? "Empresa" : "Pessoa";

const getLifecycleStage = (client: ClientRow): ClientLifecycleStage =>
  resolveClientMetrics(client).lifecycleStage;

const getLifecycleStageClass = (client: ClientRow): string =>
  resolveClientMetrics(client).lifecycleClass;

const getClientSortValue = (
  client: ClientRow,
  key: Exclude<typeof sortKey.value, "lifecycle" | "whatsapp">,
): string => {
  if (key === "name") return client.name || "";
  if (key === "type") return getClientTypeLabel(client);
  if (key === "company") return client.company || "";
  if (key === "cnpj") return client.cnpj || "";
  if (key === "cep") return client.cep || "";
  if (key === "email") return client.email || "";
  return client.phone || "";
};

const sortedRows = computed(() => {
  const list = safeRows.value;
  const key = sortKey.value;
  const dir = sortDir.value === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    if (key === "lifecycle") {
      const stageA = resolveClientMetrics(a).lifecycleStage;
      const stageB = resolveClientMetrics(b).lifecycleStage;
      return (LIFECYCLE_SORT_ORDER[stageA] - LIFECYCLE_SORT_ORDER[stageB]) * dir;
    }

    // Special handling for whatsapp sorting
    if (key === "whatsapp") {
      const av = String(a.whatsappNumber || a.cellPhone || "").toLowerCase();
      const bv = String(b.whatsappNumber || b.cellPhone || "").toLowerCase();
      return av.localeCompare(bv) * dir;
    }

    const safeKey = key as Exclude<typeof sortKey.value, "lifecycle" | "whatsapp">;
    const av = getClientSortValue(a, safeKey).toLowerCase();
    const bv = getClientSortValue(b, safeKey).toLowerCase();
    return av.localeCompare(bv) * dir;
  });
});

const totalTableRows = computed(() => sortedRows.value.length);

const totalTablePages = computed(() => {
  return Math.max(1, Math.ceil(totalTableRows.value / tablePageSize.value));
});

const pagedRows = computed(() => {
  const startIndex = (tablePage.value - 1) * tablePageSize.value;
  return sortedRows.value.slice(startIndex, startIndex + tablePageSize.value);
});

const firstVisibleRowIndex = computed(() => {
  if (!totalTableRows.value) {
    return 0;
  }
  return (tablePage.value - 1) * tablePageSize.value + 1;
});

const lastVisibleRowIndex = computed(() => {
  if (!totalTableRows.value) {
    return 0;
  }
  return Math.min(
    totalTableRows.value,
    firstVisibleRowIndex.value + pagedRows.value.length - 1,
  );
});

const setTablePage = (nextPage: number): void => {
  const clamped = Math.min(Math.max(nextPage, 1), totalTablePages.value);
  tablePage.value = clamped;
};

const setTablePageSize = (nextSize: number): void => {
  if (!TABLE_PAGE_SIZE_OPTIONS.includes(nextSize as (typeof TABLE_PAGE_SIZE_OPTIONS)[number])) {
    return;
  }
  tablePageSize.value =
    nextSize as (typeof TABLE_PAGE_SIZE_OPTIONS)[number];
  tablePage.value = 1;
};

watch([totalTableRows, tablePageSize], () => {
  if (tablePage.value > totalTablePages.value) {
    tablePage.value = totalTablePages.value;
  }
});

const resetTableScrollPosition = (): void => {
  const container = tableContainerRef.value;
  if (!container) {
    return;
  }
  container.scrollTop = 0;
};

watch([tablePage, tablePageSize], () => {
  resetTableScrollPosition();
});

watch([sortKey, sortDir], () => {
  resetTableScrollPosition();
});

watch(
  [() => expandedClientId.value, totalTableRows, tablePageSize],
  async ([expandedClient]) => {
    if (!expandedClient) {
      return;
    }
    await ensureClientPageVisible(expandedClient);
  },
);

const setSort = (key: typeof sortKey.value) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
    tablePage.value = 1;
    return;
  }
  sortKey.value = key;
  sortDir.value = "asc";
  tablePage.value = 1;
};

const sortIndicator = (key: typeof sortKey.value) => {
  if (sortKey.value !== key) return "";
  return sortDir.value === "asc" ? "▲" : "▼";
};

const getSortTitle = (
  key: typeof sortKey.value,
  columnLabel: string,
): string => {
  const isCurrentKey = sortKey.value === key;
  if (!isCurrentKey) {
    return `${TABLE_TITLES.SORT_ASC}: ${columnLabel}`;
  }
  return sortDir.value === "asc"
    ? `${TABLE_TITLES.SORT_DESC}: ${columnLabel}`
    : `${TABLE_TITLES.SORT_ASC}: ${columnLabel}`;
};

const getExportDateSuffix = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

type ExportAlignment = "left" | "center" | "right";

type ExportCellStyleOptions = {
  fillColor: string;
  fontColor?: string;
  bold?: boolean;
  align?: ExportAlignment;
  fontSize?: number;
};

type StyledWorksheet = XLSXTypes.WorkSheet & {
  "!cols"?: Array<{ wch: number }>;
  "!rows"?: Array<{ hpt?: number }>;
  "!autofilter"?: { ref: string };
};

type DashboardClientsExportFormat = "csv" | "xlsx";

type DashboardClientsExportDialogResult = {
  formats: DashboardClientsExportFormat[];
  columnKeys: DashboardClientsExportColumnKey[];
  lifecycleStages: ClientLifecycleStage[];
  onlyWithWhatsapp: boolean;
};

type XlsxModule = typeof import("xlsx-js-style");

let xlsxModulePromise: Promise<XlsxModule> | null = null;
let xlsxPrefetchScheduled = false;

const resolveXlsxModule = (): Promise<XlsxModule> => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx-js-style")
      .then((mod) => {
        if ("utils" in mod) {
          return mod as XlsxModule;
        }
        return (mod as { default: XlsxModule }).default;
      })
      .catch((error) => {
        xlsxModulePromise = null;
        throw error;
      });
  }
  return xlsxModulePromise;
};

const shouldSkipXlsxPrefetch = (): boolean => {
  if (typeof navigator === "undefined") return false;

  const connection = (
    navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
    }
  ).connection;

  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === "2g" || connection.effectiveType === "slow-2g";
};

const prefetchXlsxOnIdle = (): void => {
  if (typeof window === "undefined" || xlsxPrefetchScheduled) {
    return;
  }
  if (shouldSkipXlsxPrefetch()) {
    return;
  }

  xlsxPrefetchScheduled = true;

  const prefetch = (): void => {
    void resolveXlsxModule().catch((error) => {
      console.warn("[DashboardClientsPage] XLSX idle prefetch failed:", error);
    });
  };

  const requestIdleCallback = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    }
  ).requestIdleCallback;

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(prefetch, { timeout: 3000 });
    return;
  }

  window.setTimeout(prefetch, 1200);
};

const DEFAULT_EXPORT_COLUMN_KEYS = [
  ...DASHBOARD_CLIENTS_EXPORT_COLUMN_KEYS,
] as DashboardClientsExportColumnKey[];

const DEFAULT_EXPORT_LIFECYCLE_STAGES = [
  ...DASHBOARD_CLIENTS_EXPORT_LIFECYCLE_STAGES,
] as ClientLifecycleStage[];
const exportFlow = new TableExportFlowOrchestrator("DashboardClientsPage");

const EXPORT_COLUMN_WIDTH_BY_KEY = DASHBOARD_CLIENTS_EXPORT_COLUMN_WIDTH_BY_KEY;
const EXPORT_COLORS = DASHBOARD_CLIENTS_EXPORT_COLORS;

const EXPORT_CELL_BORDER: NonNullable<XLSXTypes.CellStyle["border"]> = {
  top: { style: "thin", color: { rgb: EXPORT_COLORS.border } },
  right: { style: "thin", color: { rgb: EXPORT_COLORS.border } },
  bottom: { style: "thin", color: { rgb: EXPORT_COLORS.border } },
  left: { style: "thin", color: { rgb: EXPORT_COLORS.border } },
};

const createExportCellStyle = ({
  fillColor,
  fontColor = EXPORT_COLORS.cellText,
  bold = false,
  align = "left",
  fontSize = 11,
}: ExportCellStyleOptions): XLSXTypes.CellStyle => ({
  font: {
    name: "Calibri",
    sz: fontSize,
    color: { rgb: fontColor },
    bold,
  },
  fill: {
    patternType: "solid",
    fgColor: { rgb: fillColor },
  },
  alignment: {
    horizontal: align,
    vertical: "center",
    wrapText: false,
  },
  border: EXPORT_CELL_BORDER,
});

const getExportZebraFill = (rowIndex: number): string =>
  rowIndex % 2 === 0 ? EXPORT_COLORS.zebraOdd : EXPORT_COLORS.zebraEven;

const getLifecycleExportStyle = (
  stage: string,
): Pick<ExportCellStyleOptions, "fillColor" | "fontColor" | "bold"> => {
  if (stage === "Prospect") {
    return { fillColor: "FFFAFBFC", fontColor: "FF475569", bold: true };
  }
  if (stage === "Ativo") {
    return { fillColor: "FFFAFBFC", fontColor: "FF1E293B", bold: true };
  }
  if (stage === "Expansão") {
    return { fillColor: "FFFAFBFC", fontColor: "FF0F172A", bold: true };
  }
  if (stage === "Em Risco") {
    return { fillColor: "FFF7F9FC", fontColor: "FF334155", bold: true };
  }
  return { fillColor: "FFF7F9FC", fontColor: "FF64748B", bold: true };
};

type ExportOutlierThresholds = {
  engagementLow: number;
  engagementHigh: number;
  projectsHigh: number;
};

const getPercentile = (values: number[], percentile: number): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? 0;
  const lowerValue = sorted[lower] ?? sorted[0] ?? 0;
  const upperValue = sorted[upper] ?? sorted[sorted.length - 1] ?? lowerValue;
  return lowerValue + (upperValue - lowerValue) * (index - lower);
};

const getExportOutlierThresholds = (
  records: readonly DashboardClientsExportRow[],
): ExportOutlierThresholds => {
  const engagementValues = records.flatMap((record) => [
    record.whatsappEngagement,
    record.emailEngagement,
  ]);
  const projectValues = records.map((record) => record.projetos);

  let engagementLow = Math.round(
    Math.min(30, Math.max(15, getPercentile(engagementValues, 0.15))),
  );
  let engagementHigh = Math.round(
    Math.max(75, Math.min(95, getPercentile(engagementValues, 0.9))),
  );
  if (!Number.isFinite(engagementLow)) engagementLow = 18;
  if (!Number.isFinite(engagementHigh)) engagementHigh = 85;
  if (engagementLow >= engagementHigh) {
    engagementLow = 18;
    engagementHigh = 85;
  }

  let projectsHigh = Math.round(Math.max(4, getPercentile(projectValues, 0.9)));
  if (!Number.isFinite(projectsHigh)) projectsHigh = 4;

  return { engagementLow, engagementHigh, projectsHigh };
};

const getEngagementOutlierStyle = (
  score: number,
  thresholds: ExportOutlierThresholds,
): Pick<ExportCellStyleOptions, "fillColor" | "fontColor" | "bold"> | null => {
  if (score >= thresholds.engagementHigh) {
    return {
      fillColor: EXPORT_COLORS.accentSoft,
      fontColor: EXPORT_COLORS.accent,
      bold: true,
    };
  }
  if (score <= thresholds.engagementLow) {
    return {
      fillColor: EXPORT_COLORS.accentSubtle,
      fontColor: EXPORT_COLORS.accent,
      bold: false,
    };
  }
  return null;
};

const getProjectOutlierStyle = (
  projectCount: number,
  thresholds: ExportOutlierThresholds,
): Pick<ExportCellStyleOptions, "fillColor" | "fontColor" | "bold"> | null => {
  if (projectCount >= thresholds.projectsHigh) {
    return {
      fillColor: EXPORT_COLORS.accentSoft,
      fontColor: EXPORT_COLORS.accent,
      bold: true,
    };
  }
  if (projectCount === 0) {
    return {
      fillColor: EXPORT_COLORS.accentSubtle,
      fontColor: EXPORT_COLORS.accent,
      bold: false,
    };
  }
  return null;
};

const normalizeColumnKeys = (
  keys: readonly DashboardClientsExportColumnKey[],
): DashboardClientsExportColumnKey[] => {
  const selected = new Set(keys);
  const ordered = DEFAULT_EXPORT_COLUMN_KEYS.filter((key) => selected.has(key));
  return ordered.length ? ordered : [...DEFAULT_EXPORT_COLUMN_KEYS];
};

const normalizeLifecycleStages = (
  stages: readonly ClientLifecycleStage[],
): ClientLifecycleStage[] => {
  const selected = new Set(stages);
  const ordered = DEFAULT_EXPORT_LIFECYCLE_STAGES.filter((stage) =>
    selected.has(stage),
  );
  return ordered.length ? ordered : [...DEFAULT_EXPORT_LIFECYCLE_STAGES];
};

const normalizeFormats = (
  formats: readonly DashboardClientsExportFormat[],
): DashboardClientsExportFormat[] => {
  const selected = new Set<DashboardClientsExportFormat>(formats);
  const ordered = (["csv", "xlsx"] as const).filter((format) =>
    selected.has(format),
  );
  return ordered.length ? [...ordered] : ["csv", "xlsx"];
};

const isCenteredExportColumn = (key: DashboardClientsExportColumnKey): boolean =>
  key === "tipo" ||
  key === "lifecycle" ||
  key === "whatsappEngagement" ||
  key === "emailEngagement" ||
  key === "projetos";

const buildCsvBlueprint = (
  columnKeys: readonly DashboardClientsExportColumnKey[],
): DashboardClientsCsvBlueprint =>
  new DashboardClientsCsvBlueprint({ columns: normalizeColumnKeys(columnKeys) });

const buildExportRows = (): DashboardClientsExportRow[] =>
  sortedRows.value.map((client) => ({
    nome: client.name,
    tipo: getClientTypeLabel(client),
    empresa: client.company || "",
    cnpj: client.cnpj || "",
    cep: client.cep || "",
    lifecycle: getLifecycleStage(client),
    email: client.email || "",
    telefone: client.phone || "",
    whatsapp: client.whatsappNumber || client.cellPhone || "",
    whatsappEngagement: calcWhatsappScore(client),
    emailEngagement: calcEmailScore(client),
    projetos: getClientProjectCount(client.id),
  }));

const getFilteredExportRows = (
  config: DashboardClientsExportDialogResult,
): DashboardClientsExportRow[] => {
  const selectedLifecycles = new Set(config.lifecycleStages);

  return buildExportRows().filter((record) => {
    if (!selectedLifecycles.has(record.lifecycle as ClientLifecycleStage)) {
      return false;
    }
    if (config.onlyWithWhatsapp && !record.whatsapp) {
      return false;
    }
    return true;
  });
};

const buildExportAoa = (
  csvBlueprint: DashboardClientsCsvBlueprint,
  records: readonly DashboardClientsExportRow[],
): Array<Array<string | number | boolean>> =>
  csvBlueprint.toAoa(records);

const applyXlsxExportStyling = (
  xlsx: XlsxModule,
  worksheet: StyledWorksheet,
  records: readonly DashboardClientsExportRow[],
  columnKeys: readonly DashboardClientsExportColumnKey[],
): void => {
  const thresholds = getExportOutlierThresholds(records);
  worksheet["!cols"] = columnKeys.map((key) => ({
    wch: EXPORT_COLUMN_WIDTH_BY_KEY[key],
  }));
  worksheet["!rows"] = [{ hpt: 30 }, ...records.map(() => ({ hpt: 24 }))];
  const lastColumn = xlsx.utils.encode_col(Math.max(columnKeys.length - 1, 0));
  worksheet["!autofilter"] = { ref: `A1:${lastColumn}1` };

  for (let column = 0; column < columnKeys.length; column += 1) {
    const address = xlsx.utils.encode_cell({ r: 0, c: column });
    const cell = worksheet[address];
    if (!cell) continue;
    cell.s = createExportCellStyle({
      fillColor: EXPORT_COLORS.headerFill,
      fontColor: EXPORT_COLORS.headerFont,
      bold: true,
      align: "center",
      fontSize: 12,
    });
  }

  records.forEach((record, rowIndex) => {
    const excelRow = rowIndex + 1;
    const rowFillColor = getExportZebraFill(rowIndex);

    for (let column = 0; column < columnKeys.length; column += 1) {
      const key = columnKeys[column];
      if (!key) continue;
      const address = xlsx.utils.encode_cell({ r: excelRow, c: column });
      const cell = worksheet[address];
      if (!cell) continue;

      const styleOptions: ExportCellStyleOptions = {
        fillColor: rowFillColor,
        fontColor: EXPORT_COLORS.cellText,
        align: isCenteredExportColumn(key) ? "center" : "left",
      };

      if (key === "lifecycle") {
        const lifecycleStyle = getLifecycleExportStyle(record.lifecycle);
        styleOptions.fillColor = lifecycleStyle.fillColor;
        styleOptions.fontColor = lifecycleStyle.fontColor;
        styleOptions.bold = lifecycleStyle.bold;
        styleOptions.align = "center";
      } else if (key === "whatsapp" && !record.whatsapp) {
        styleOptions.fillColor = "FFFAFBFD";
        styleOptions.fontColor = EXPORT_COLORS.mutedText;
        styleOptions.align = "center";
      } else if (key === "whatsappEngagement" || key === "emailEngagement") {
        const score =
          key === "whatsappEngagement"
            ? record.whatsappEngagement
            : record.emailEngagement;
        const scoreStyle = getEngagementOutlierStyle(score, thresholds);
        styleOptions.align = "center";
        if (scoreStyle) {
          styleOptions.fillColor = scoreStyle.fillColor;
          styleOptions.fontColor = scoreStyle.fontColor;
          styleOptions.bold = scoreStyle.bold;
        }
        cell.z = "0\"%\"";
      } else if (key === "projetos") {
        const projectStyle = getProjectOutlierStyle(record.projetos, thresholds);
        styleOptions.align = "center";
        if (projectStyle) {
          styleOptions.fillColor = projectStyle.fillColor;
          styleOptions.fontColor = projectStyle.fontColor;
          styleOptions.bold = projectStyle.bold;
        }
      }

      cell.s = createExportCellStyle(styleOptions);
    }
  });
};

const openExportDialog =
  async (): Promise<DashboardClientsExportDialogResult | null> =>
    ModalService.open<DashboardClientsExportDialogResult>(
      DashboardClientsExportModal,
      {
        title: "Exportar Clientes",
        size: "md",
        data: {
          totalRows: sortedRows.value.length,
          defaultFormats: ["csv", "xlsx"] as DashboardClientsExportFormat[],
          defaultColumnKeys: [...DEFAULT_EXPORT_COLUMN_KEYS],
          defaultLifecycleStages: [...DEFAULT_EXPORT_LIFECYCLE_STAGES],
          defaultOnlyWithWhatsapp: false,
        },
      },
    );

const handleOpenExportModal = async () => {
  await exportFlow.execute({
    openDialog: openExportDialog,
    emptyStateMessage: "Não há clientes para exportar com os filtros selecionados.",
    buildRecords: (selection) => {
      const formats = normalizeFormats(selection.formats);
      const columnKeys = normalizeColumnKeys(selection.columnKeys);
      const lifecycleStages = normalizeLifecycleStages(selection.lifecycleStages);
      return getFilteredExportRows({
        ...selection,
        formats,
        columnKeys,
        lifecycleStages,
      });
    },
    exportRecords: async (records, selection) => {
      const formats = normalizeFormats(selection.formats);
      const columnKeys = normalizeColumnKeys(selection.columnKeys);
      const csvBlueprint = buildCsvBlueprint(columnKeys);
      const exportedFormats: DashboardClientsExportFormat[] = [];

      if (formats.includes("csv")) {
        const csvBuilder = new CsvDocumentBuilder(csvBlueprint);
        const csv = csvBuilder.build(records);
        downloadBlob(
          new Blob([csv], { type: "text/csv;charset=utf-8;" }),
          `clientes-dashboard-${getExportDateSuffix()}.csv`,
        );
        exportedFormats.push("csv");
      }

      if (formats.includes("xlsx")) {
        const xlsx = await resolveXlsxModule();
        const worksheet = xlsx.utils.aoa_to_sheet(
          buildExportAoa(csvBlueprint, records),
        ) as StyledWorksheet;
        applyXlsxExportStyling(
          xlsx,
          worksheet,
          records,
          csvBlueprint.getColumnKeys(),
        );

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Clientes");

        const content = xlsx.write(workbook, {
          type: "array",
          bookType: "xlsx",
          cellStyles: true,
        });
        downloadBlob(
          new Blob([content], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `clientes-dashboard-${getExportDateSuffix()}.xlsx`,
        );
        exportedFormats.push("xlsx");
      }

      return exportedFormats;
    },
  });
};

const DashboardClientsExportModal = defineAsyncComponent(
  () => import("../components/dashboard/DashboardClientsExportModal.vue"),
);

const ClientStatisticsDashboard = defineAsyncComponent(
  () => import("../components/dashboard/ClientStatisticsDashboard.vue"),
);

const ClientDetailView = defineAsyncComponent(
  () => import("../components/client/ClientDetailView.vue"),
);

const ProjectsTableModal = defineAsyncComponent(
  () => import("../components/dashboard/ProjectsTableModal.vue"),
);

const ClientFormModal = defineAsyncComponent(
  () => import("../components/forms/ClientFormModal.vue"),
);

const openCreateClient = async () => {
  const result = await ModalService.open(ClientFormModal, {
    title: "Novo Cliente",
    size: "sm",
  });
  if (result) await load();
};

const handleCheckProjects = async (client: ClientRow) => {
  // Ensure projects are loaded
  if (!projectsStore.rows.length) await projectsStore.list();

  const clientProjects = projectsStore.rows.filter(
    (p) => p?.clientId === client.id,
  );

  await ModalService.open(ProjectsTableModal, {
    title: `Projetos de ${client.name}`,
    size: "xl",
    data: {
      projects: clientProjects,
    },
  });
};

const handleEdit = (client: ClientRow) => {
  ModalService.open(ClientFormModal, {
    title: `Editar Cliente: ${client.name}`,
    size: "sm",
    data: { client },
  }).then((result) => {
    if (result) load();
  });
};

const handleDelete = async (client: ClientRow) => {
  const confirmed = await AlertService.confirm(
    "Excluir Cliente",
    `Tem certeza que deseja excluir \"${client.name}\"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  try {
    await ApiClientService.clients.remove(client.id);
    await AlertService.success("Excluído", `"${client.name}" foi excluído.`);
    await load();
  } catch (e) {
    console.error("[DashboardClientsPage] Delete failed:", e);
    await AlertService.error("Erro", "Falha ao excluir cliente.");
  }
};

const calcWhatsappScore = (client: ClientRow): number =>
  resolveClientMetrics(client).whatsappScore;

const calcEmailScore = (client: ClientRow): number =>
  resolveClientMetrics(client).emailScore;

// WhatsApp stub alert
const showWhatsAppStub = (number: string) => {
  window.alert(
    `Chamada WhatsApp para ${number} — funcionalidade desabilitada nesta versão.`,
  );
};

// Dashboard-to-Action automation hook stub
const handleAutomationHook = (client: ClientRow): void => {
  const stage = getLifecycleStage(client);
  const projectCount = getClientProjectCount(client.id);
  const suggestedAction =
    stage === "Em Risco"
      ? "Criar follow-up imediato"
      : stage === "Prospect"
        ? "Enviar primeira abordagem"
        : stage === "Expansão"
          ? "Oferecer upsell/cross-sell"
          : "Agendar próximo passo";

  window.alert(
    `Hook de automação (${client.name})\n` +
      `Lifecycle: ${stage}\n` +
      `Projetos: ${projectCount}\n` +
      `Ação sugerida: ${suggestedAction}`,
  );
};

// Engagement Details Modal
const EngagementDetailsModal = defineAsyncComponent(
  () => import("../components/dashboard/EngagementDetailsModal.vue"),
);

const handleShowWhatsappEngagement = async (client: ClientRow) => {
  await ModalService.open(EngagementDetailsModal, {
    title: `Engajamento WhatsApp - ${client.name}`,
    size: "md",
    data: {
      type: "whatsapp",
      client,
      analytics: client.whatsappAnalytics,
      score: calcWhatsappScore(client),
    },
  });
};

const handleShowEmailEngagement = async (client: ClientRow) => {
  await ModalService.open(EngagementDetailsModal, {
    title: `Engajamento E-mail - ${client.name}`,
    size: "md",
    data: {
      type: "email",
      client,
      analytics: client.emailAnalytics,
      score: calcEmailScore(client),
    },
  });
};
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="page-header__content">
        <h1 class="page-title">Meus Clientes</h1>
        <p class="page-subtitle">Gerenciamento de clientes e conexões.</p>
      </div>
      <div class="page-header__actions">
        <button
          class="btn btn-sm btn-ghost"
          title="Configurar exportação da visão atual"
          @mouseenter="prefetchXlsxOnIdle"
          @focus="prefetchXlsxOnIdle"
          @click="handleOpenExportModal"
        >
          Exportar...
        </button>
      </div>
    </header>

    <div
      v-if="syncing"
      class="page-syncing"
      role="status"
      aria-live="polite"
    >
      <span class="page-syncing__spinner" aria-hidden="true"></span>
      <span>Atualizando lista de clientes em segundo plano…</span>
    </div>

    <!-- Statistics Dashboard -->
    <Suspense v-if="!loading && rows && rows.length > 0">
      <template #default>
        <ClientStatisticsDashboard
          :clients="safeRows"
          :projects="safeProjects"
          :leads="safeLeads"
          :loading="loading"
          @select-client="handleSelectClientFromHighlights"
        />
      </template>
      <template #fallback>
        <div class="dashboard-async-fallback" role="status" aria-live="polite">
          <span class="dashboard-async-fallback__spinner" aria-hidden="true"></span>
          <span>Carregando estatísticas dos clientes…</span>
        </div>
      </template>
    </Suspense>

    <div v-if="loading" class="p-8 text-center opacity-70">
      Carregando clientes...
    </div>
    <div
      v-else-if="error && (!rows || rows.length === 0)"
      class="p-4 text-red-600 bg-red-50 rounded"
    >
      {{ error }}
    </div>

    <div
      v-else
      ref="tableContainerRef"
      class="table-container card"
    >
      <div
        v-if="error && rows && rows.length"
        class="mb-4 p-3 text-amber-700 bg-amber-50 rounded"
      >
        Alguns dados podem estar desatualizados. Recarregue para tentar
        novamente.
      </div>
      <table class="data-table" role="table" aria-label="Tabela de clientes">
        <thead>
          <tr role="row">
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'name' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'name'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por nome"
                :title="getSortTitle('name', 'Nome')"
                @click="setSort('name')"
              >
                Nome
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("name")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'type' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'type'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por tipo"
                :title="getSortTitle('type', 'Tipo')"
                @click="setSort('type')"
              >
                Tipo
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("type")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'company' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'company'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por empresa"
                :title="getSortTitle('company', 'Empresa')"
                @click="setSort('company')"
              >
                Empresa
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("company")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'cnpj' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'cnpj'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por CNPJ"
                :title="getSortTitle('cnpj', 'CNPJ')"
                @click="setSort('cnpj')"
              >
                CNPJ
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("cnpj")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'cep' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'cep'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por CEP"
                :title="getSortTitle('cep', 'CEP')"
                @click="setSort('cep')"
              >
                CEP
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("cep")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'lifecycle' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'lifecycle'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por lifecycle"
                :title="getSortTitle('lifecycle', 'Lifecycle')"
                @click="setSort('lifecycle')"
              >
                Lifecycle
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("lifecycle")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'email' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'email'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por email"
                :title="getSortTitle('email', 'E-mail')"
                @click="setSort('email')"
              >
                Email
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("email")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'phone' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'phone'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por telefone"
                :title="getSortTitle('phone', 'Telefone')"
                @click="setSort('phone')"
              >
                Telefone
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("phone")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'whatsapp' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'whatsapp'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por WhatsApp"
                :title="getSortTitle('whatsapp', 'WhatsApp')"
                @click="setSort('whatsapp')"
              >
                WhatsApp
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("whatsapp")
                }}</span>
              </button>
            </th>
            <th
              role="columnheader"
              class="text-center"
              aria-label="Engajamento WhatsApp"
            >
              Engaj. WhatsApp
            </th>
            <th
              role="columnheader"
              class="text-center"
              aria-label="Engajamento Email"
            >
              Engaj. E-mail
            </th>
            <th
              role="columnheader"
              class="text-center"
              aria-label="Projetos do cliente"
            >
              Projetos
            </th>
            <th
              class="text-center"
              role="columnheader"
              aria-label="Ações disponíveis"
            >
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="c in pagedRows" :key="c?.id || 'unknown'">
            <tr
              v-if="c"
              :id="`client-row-${c.id}`"
              class="client-row"
              role="row"
              :data-client-id="CLIENT_DATA_ATTRS.CLIENT_ID"
            >
              <td
                class="name-cell"
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
              >
                <div class="name-cell__content">
                  <button
                    class="btn-expand"
                    :class="{ 'btn-expand--active': expandedClientId === c.id }"
                    :data-client-id="CLIENT_DATA_ATTRS.CLIENT_ID"
                    :data-expanded="expandedClientId === c.id"
                    :aria-expanded="expandedClientId === c.id"
                    :aria-controls="`client-details-${c.id}`"
                    :aria-label="
                      expandedClientId === c.id
                        ? 'Recolher detalhes do cliente'
                        : 'Ver detalhes do cliente'
                    "
                    :title="
                      expandedClientId === c.id
                        ? TABLE_TITLES.COLLAPSE_ROW
                        : TABLE_TITLES.EXPAND_ROW
                    "
                    @click="toggleClientExpand(c.id)"
                  >
                    {{ expandedClientId === c.id ? "▼" : "▶" }}
                  </button>
                  <router-link
                    :to="{ name: 'ClientProfile', params: { id: c.id } }"
                    class="client-link"
                    :title="`Abrir perfil de ${c.name}`"
                  >
                    {{ c.name }}
                  </router-link>
                </div>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                class="text-center"
                :title="`Tipo: ${getClientTypeLabel(c)}`"
              >
                <span class="client-type-badge">
                  {{ getClientTypeLabel(c) }}
                </span>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :title="c.company || 'Empresa não informada'"
              >
                {{ c.company || "—" }}
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :title="c.cnpj || 'CNPJ não informado'"
              >
                {{ c.cnpj || "—" }}
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :title="c.cep || 'CEP não informado'"
              >
                {{ c.cep || "—" }}
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                class="text-center"
              >
                <span
                  class="lifecycle-badge"
                  :class="`lifecycle-badge--${getLifecycleStageClass(c)}`"
                  :title="`Lifecycle: ${getLifecycleStage(c)}`"
                >
                  {{ getLifecycleStage(c) }}
                </span>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :title="c.email || 'Email não informado'"
              >
                {{ c.email || "—" }}
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :title="c.phone || 'Telefone não informado'"
              >
                {{ c.phone || "—" }}
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :class="{ 'has-whatsapp': c.hasWhatsapp }"
              >
                <div class="whatsapp-cell">
                  <button
                    v-if="c.whatsappNumber || (c.hasWhatsapp && c.cellPhone)"
                    type="button"
                    class="whatsapp-link"
                    :title="`WhatsApp: ${c.whatsappNumber || c.cellPhone}`"
                    :data-whatsapp-number="CLIENT_DATA_ATTRS.WHATSAPP_NUMBER"
                    :data-is-primary="CLIENT_DATA_ATTRS.IS_PRIMARY"
                    @click="
                      showWhatsAppStub(c.whatsappNumber || c.cellPhone || '')
                    "
                  >
                    <span class="whatsapp-icon" aria-hidden="true">💬</span>
                    <span class="whatsapp-number">{{
                      c.whatsappNumber || c.cellPhone || "—"
                    }}</span>
                    <span
                      v-if="c.preferredContact === 'whatsapp'"
                      class="primary-badge"
                      title="Meio de contato preferido"
                      aria-label="Contato preferido"
                      >⭐</span
                    >
                  </button>
                  <span v-else class="no-whatsapp">—</span>
                </div>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                class="text-center"
              >
                <button
                  class="score-chip score-chip--whatsapp"
                  :class="{
                    'score-chip--low': calcWhatsappScore(c) < 30,
                    'score-chip--medium':
                      calcWhatsappScore(c) >= 30 && calcWhatsappScore(c) < 60,
                    'score-chip--high': calcWhatsappScore(c) >= 60,
                  }"
                  :title="`Ver detalhes de engajamento WhatsApp (Score: ${calcWhatsappScore(c)}%)`"
                  @click="handleShowWhatsappEngagement(c)"
                >
                  <span class="score-chip__icon">💬</span>
                  <span class="score-chip__value"
                    >{{ calcWhatsappScore(c) }}%</span
                  >
                </button>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                class="text-center"
              >
                <button
                  class="score-chip score-chip--email"
                  :class="{
                    'score-chip--low': calcEmailScore(c) < 30,
                    'score-chip--medium':
                      calcEmailScore(c) >= 30 && calcEmailScore(c) < 60,
                    'score-chip--high': calcEmailScore(c) >= 60,
                  }"
                  :title="`Ver detalhes de engajamento E-mail (Score: ${calcEmailScore(c)}%)`"
                  @click="handleShowEmailEngagement(c)"
                >
                  <span class="score-chip__icon">📧</span>
                  <span class="score-chip__value"
                    >{{ calcEmailScore(c) }}%</span
                  >
                </button>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                class="text-center"
              >
                <button
                  class="score-chip score-chip--projects"
                  :class="{
                    'score-chip--none': getClientProjectCount(c.id) === 0,
                    'score-chip--some': getClientProjectCount(c.id) > 0,
                  }"
                  :title="`Ver ${getClientProjectCount(c.id)} projeto(s) do cliente`"
                  @click="handleCheckProjects(c)"
                >
                  <span class="score-chip__icon">📁</span>
                  <span class="score-chip__value">{{
                    getClientProjectCount(c.id)
                  }}</span>
                </button>
              </td>
              <td
                class="text-center"
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
              >
                <div class="client-actions">
                  <button
                    class="btn btn-sm btn-ghost"
                    :data-action="TEST_DATA_ATTRS.ACTION"
                    :data-client-id="CLIENT_DATA_ATTRS.CLIENT_ID"
                    title="Disparar automação"
                    aria-label="Disparar automação"
                    @click="handleAutomationHook(c)"
                  >
                    ⚡
                  </button>
                  <button
                    class="btn btn-sm btn-ghost"
                    :data-action="TEST_DATA_ATTRS.ACTION"
                    :data-client-id="CLIENT_DATA_ATTRS.CLIENT_ID"
                    title="Editar cliente"
                    aria-label="Editar cliente"
                    @click="handleEdit(c)"
                  >
                    ✏️
                  </button>
                  <button
                    class="btn btn-sm btn-ghost"
                    :data-action="TEST_DATA_ATTRS.ACTION"
                    :data-client-id="CLIENT_DATA_ATTRS.CLIENT_ID"
                    title="Excluir cliente"
                    aria-label="Excluir cliente"
                    @click="handleDelete(c)"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
            <tr
              v-if="c && expandedClientId === c.id"
              class="detail-row"
              :data-detail-for="c.id"
            >
              <td colspan="13" :id="`client-details-${c.id}`" role="cell">
                <Suspense>
                  <template #default>
                    <ClientDetailView
                      :client="c"
                      :projects="safeProjects"
                      :leads="safeLeads"
                      @close="toggleClientExpand(c.id)"
                    />
                  </template>
                  <template #fallback>
                    <div
                      class="dashboard-async-fallback dashboard-async-fallback--detail"
                      role="status"
                      aria-live="polite"
                    >
                      <span
                        class="dashboard-async-fallback__spinner"
                        aria-hidden="true"
                      ></span>
                      <span>Carregando detalhes do cliente…</span>
                    </div>
                  </template>
                </Suspense>
              </td>
            </tr>
          </template>
          <tr v-if="totalTableRows === 0" role="row">
            <td colspan="13" class="text-center py-8 opacity-60" role="cell">
              Nenhum cliente encontrado.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav
      v-if="totalTableRows > 0"
      class="table-pagination"
      aria-label="Paginação da tabela de clientes"
    >
      <p class="table-pagination__summary" aria-live="polite">
        Exibindo {{ firstVisibleRowIndex }}-{{ lastVisibleRowIndex }} de
        {{ totalTableRows }} clientes
      </p>
      <label class="table-pagination__size">
        <span>Linhas por página</span>
        <select
          class="table-pagination__select"
          :value="tablePageSize"
          @change="
            setTablePageSize(
              Number(($event.target as HTMLSelectElement).value),
            )
          "
        >
          <option v-for="size in TABLE_PAGE_SIZE_OPTIONS" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </label>
      <div class="table-pagination__actions">
        <button
          class="btn btn-sm btn-ghost"
          :disabled="tablePage <= 1"
          @click="setTablePage(tablePage - 1)"
        >
          Anterior
        </button>
        <span class="table-pagination__page">
          Página {{ tablePage }} de {{ totalTablePages }}
        </span>
        <button
          class="btn btn-sm btn-ghost"
          :disabled="tablePage >= totalTablePages"
          @click="setTablePage(tablePage + 1)"
        >
          Próxima
        </button>
      </div>
    </nav>

    <div class="page-footer">
      <button
        class="btn btn-sm btn-primary btn-new-client"
        :title="`${ACTION_TITLES.CREATE}: cliente`"
        @click="openCreateClient"
      >
        <span class="btn-icon">+</span>
        Novo Cliente
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/pages/dashboard-clients.module";
</style>
