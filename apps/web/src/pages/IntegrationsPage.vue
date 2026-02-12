<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import IntegrationCard from "../components/integrations/IntegrationCard.vue";
import IntegrationHelpModal from "../components/integrations/IntegrationHelpModal.vue";
import {
  getAllIntegrations,
  type IntegrationLogoPresentation,
  type IntegrationStatus,
} from "../utils/constants/integration-constants";
import IntegrationsApiService, {
  type IntegrationConfigOverviewResponse,
  type IntegrationHealthResponse,
  type IntegrationSyncJobResponse,
} from "../services/IntegrationsApiService";
import AlertService from "../services/AlertService";
import IntegrationConfigAutocompleteService from "../services/IntegrationConfigAutocompleteService";
import IntegrationHelpCatalogService, {
  BOOTSTRAP_QUESTION_CIRCLE_ICON_PATHS,
  type IntegrationHelpEntry,
} from "../services/IntegrationHelpCatalogService";

interface Integration {
  id: string;
  name: string;
  description: string;
  type: string;
  status: IntegrationStatus;
  icon: string;
  logoUrl?: string;
  logoPresentation?: IntegrationLogoPresentation;
  color: string;
  features: string[];
  configured: boolean;
  lastError?: string;
  configurable: boolean;
}

type GlpiAuthMode = "user_token" | "basic";
type NextcloudAuthMode = "app_password" | "password";

interface GlpiConfigForm {
  baseUrl: string;
  appToken: string;
  authMode: GlpiAuthMode;
  userToken: string;
  username: string;
  password: string;
}

interface SatConfigForm {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  companyId: string;
  syncInvoices: boolean;
  syncProducts: boolean;
}

interface NextcloudConfigForm {
  baseUrl: string;
  username: string;
  defaultFolder: string;
  authMode: NextcloudAuthMode;
  appPassword: string;
  password: string;
}

interface ZimbraConfigForm {
  baseUrl: string;
  username: string;
  password: string;
}

interface OutlookConfigForm {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

interface WhatsAppConfigForm {
  accessToken: string;
  businessAccountId: string;
  phoneNumberId: string;
  apiVersion: string;
}

interface GlpiStoredSecrets {
  appToken: boolean;
  userToken: boolean;
  password: boolean;
}

interface SatStoredSecrets {
  clientSecret: boolean;
}

interface NextcloudStoredSecrets {
  appPassword: boolean;
  password: boolean;
}

interface ZimbraStoredSecrets {
  password: boolean;
}

interface OutlookStoredSecrets {
  clientSecret: boolean;
}

interface WhatsAppStoredSecrets {
  accessToken: boolean;
}

interface WhatsAppSetupChecklistItem {
  key: string;
  label: string;
  required: boolean;
  present: boolean;
  note?: string;
}

interface IntegrationHelpTriggerPayload {
  triggerElementId: string;
}

type IntegrationConfigFormId =
  | "glpi"
  | "sat"
  | "nextcloud"
  | "zimbra"
  | "outlook"
  | "whatsapp";

const INTEGRATION_AUTOCOMPLETE_FIELDS: Record<
  IntegrationConfigFormId,
  readonly string[]
> = {
  glpi: ["baseUrl", "username"],
  sat: ["baseUrl", "clientId", "companyId"],
  nextcloud: ["baseUrl", "username", "defaultFolder"],
  zimbra: ["baseUrl", "username"],
  outlook: ["tenantId", "clientId"],
  whatsapp: ["businessAccountId", "phoneNumberId", "apiVersion"],
};

const BOOTSTRAP_LINK_45_DEG_ICON_PATHS = Object.freeze([
  "M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287",
  "M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243",
]) as readonly string[];

const BOOTSTRAP_INFO_CIRCLE_ICON_PATHS = Object.freeze([
  "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16",
  "m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0",
]) as readonly string[];

const integrations = ref<Integration[]>([]);
const expandedCards = ref<Set<string>>(new Set());
const isLoadingIntegrations = ref(false);
const actionInProgress = ref<string | null>(null);
const configOverviewLoading = ref<string | null>(null);
const isGlpiConfigOpen = ref(false);
const isSatConfigOpen = ref(false);
const isNextcloudConfigOpen = ref(false);
const isZimbraConfigOpen = ref(false);
const isOutlookConfigOpen = ref(false);
const isWhatsAppConfigOpen = ref(false);
const isWhatsAppHealthLoading = ref(false);
const isWhatsAppSyncLoading = ref(false);
const whatsappHealth = ref<IntegrationHealthResponse | null>(null);
const whatsappSyncJob = ref<IntegrationSyncJobResponse | null>(null);
const whatsappSyncHint = ref("");
const isIntegrationHelpOpen = ref(false);
const activeIntegrationHelpId = ref<string | null>(null);
const activeHelpTriggerElementId = ref<string>("");
const integrationAutocomplete = new IntegrationConfigAutocompleteService();
const inputSuggestionsByKey = ref<Record<string, string[]>>({});

const createDefaultGlpiConfigForm = (): GlpiConfigForm => ({
  baseUrl: "",
  appToken: "",
  authMode: "user_token",
  userToken: "",
  username: "",
  password: "",
});

const createDefaultSatConfigForm = (): SatConfigForm => ({
  baseUrl: "",
  clientId: "",
  clientSecret: "",
  companyId: "",
  syncInvoices: true,
  syncProducts: true,
});

const createDefaultNextcloudConfigForm = (): NextcloudConfigForm => ({
  baseUrl: "",
  username: "",
  defaultFolder: "/CRM",
  authMode: "app_password",
  appPassword: "",
  password: "",
});

const createDefaultZimbraConfigForm = (): ZimbraConfigForm => ({
  baseUrl: "",
  username: "",
  password: "",
});

const createDefaultOutlookConfigForm = (): OutlookConfigForm => ({
  tenantId: "",
  clientId: "",
  clientSecret: "",
});

const createDefaultWhatsAppConfigForm = (): WhatsAppConfigForm => ({
  // TODO(user): replace with real Meta credentials in your secure environment.
  accessToken: "",
  businessAccountId: "",
  phoneNumberId: "",
  apiVersion: "v18.0",
});

const glpiConfigForm = ref<GlpiConfigForm>(createDefaultGlpiConfigForm());
const satConfigForm = ref<SatConfigForm>(createDefaultSatConfigForm());
const nextcloudConfigForm = ref<NextcloudConfigForm>(
  createDefaultNextcloudConfigForm(),
);
const zimbraConfigForm = ref<ZimbraConfigForm>(createDefaultZimbraConfigForm());
const outlookConfigForm = ref<OutlookConfigForm>(createDefaultOutlookConfigForm());
const whatsappConfigForm = ref<WhatsAppConfigForm>(
  createDefaultWhatsAppConfigForm(),
);
const glpiStoredSecrets = ref<GlpiStoredSecrets>({
  appToken: false,
  userToken: false,
  password: false,
});
const satStoredSecrets = ref<SatStoredSecrets>({
  clientSecret: false,
});
const nextcloudStoredSecrets = ref<NextcloudStoredSecrets>({
  appPassword: false,
  password: false,
});
const zimbraStoredSecrets = ref<ZimbraStoredSecrets>({
  password: false,
});
const outlookStoredSecrets = ref<OutlookStoredSecrets>({
  clientSecret: false,
});
const whatsappStoredSecrets = ref<WhatsAppStoredSecrets>({
  accessToken: false,
});

const toBaseIntegrations = (): Integration[] =>
  getAllIntegrations().map((integration) => ({
    id: integration.id,
    name: integration.name,
    description: integration.description,
    type: integration.type,
    status: "disconnected",
    icon: integration.icon,
    logoUrl: integration.logoUrl,
    logoPresentation: integration.logoPresentation,
    color: integration.color,
    features: integration.features.map((feature) => feature.label),
    configured: false,
    configurable: integration.configurable,
  }));

const mergeStatuses = async (): Promise<void> => {
  isLoadingIntegrations.value = true;
  const base = toBaseIntegrations();

  try {
    const statuses = await IntegrationsApiService.list();
    const statusById = new Map(statuses.map((status) => [status.id, status]));

    integrations.value = base.map((integration) => {
      const status = statusById.get(integration.id);
      if (!status) {
        return integration;
      }

      return {
        ...integration,
        status: status.status,
        configured: status.configured,
        lastError: status.lastError,
      };
    });
  } catch (error) {
    integrations.value = base;
    await AlertService.error(
      "Falha ao carregar integrações",
      "Não foi possível consultar o status atual das integrações.",
    );
  } finally {
    isLoadingIntegrations.value = false;
  }
};

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const buildSuggestionsKey = (
  formId: IntegrationConfigFormId,
  inputId: string,
): string => `${formId}:${inputId}`;

const integrationConfigFormElementId = (formId: IntegrationConfigFormId): string =>
  `integration-config-form-${formId}`;

const integrationConfigInputElementId = (
  formId: IntegrationConfigFormId,
  inputId: string,
): string => `integration-config-${formId}-${inputId}`;

const integrationConfigDatalistId = (
  formId: IntegrationConfigFormId,
  inputId: string,
): string => IntegrationConfigAutocompleteService.datalistId(formId, inputId);

const getInputSuggestions = (
  formId: IntegrationConfigFormId,
  inputId: string,
): string[] => inputSuggestionsByKey.value[buildSuggestionsKey(formId, inputId)] ?? [];

const refreshInputSuggestions = (
  formId: IntegrationConfigFormId,
  inputId: string,
): void => {
  const nextSuggestions = integrationAutocomplete.listSuggestions(formId, inputId);
  inputSuggestionsByKey.value[buildSuggestionsKey(formId, inputId)] =
    nextSuggestions;
};

const refreshFormSuggestions = (formId: IntegrationConfigFormId): void => {
  for (const inputId of INTEGRATION_AUTOCOMPLETE_FIELDS[formId]) {
    refreshInputSuggestions(formId, inputId);
  }
};

const trackInputValueForSuggestions = (
  formId: IntegrationConfigFormId,
  inputId: string,
  value: string,
): void => {
  integrationAutocomplete.schedulePersist(formId, inputId, value, () => {
    refreshInputSuggestions(formId, inputId);
  });
};

const persistFormSuggestions = (
  formId: IntegrationConfigFormId,
  values: Record<string, string>,
): void => {
  integrationAutocomplete.persistBatch(formId, values);
  refreshFormSuggestions(formId);
};

const applyGlpiConfigOverview = (
  overview: IntegrationConfigOverviewResponse,
): void => {
  const values = overview.values;
  const secrets = overview.secrets;

  glpiStoredSecrets.value = {
    appToken: Boolean(secrets.appToken),
    userToken: Boolean(secrets.userToken),
    password: Boolean(secrets.password),
  };

  glpiConfigForm.value.baseUrl = asString(values.baseUrl);
  glpiConfigForm.value.username = asString(values.username);
  glpiConfigForm.value.appToken = "";
  glpiConfigForm.value.userToken = "";
  glpiConfigForm.value.password = "";

  const authModeValue = asString(values.authMode);
  if (authModeValue === "basic" || authModeValue === "user_token") {
    glpiConfigForm.value.authMode = authModeValue;
    return;
  }

  glpiConfigForm.value.authMode = glpiStoredSecrets.value.userToken
    ? "user_token"
    : "basic";
};

const applySatConfigOverview = (
  overview: IntegrationConfigOverviewResponse,
): void => {
  const values = overview.values;
  const secrets = overview.secrets;

  satStoredSecrets.value = {
    clientSecret: Boolean(secrets.clientSecret),
  };

  satConfigForm.value.baseUrl = asString(values.baseUrl);
  satConfigForm.value.clientId = asString(values.clientId);
  satConfigForm.value.companyId = asString(values.companyId);
  satConfigForm.value.syncInvoices = asBoolean(values.syncInvoices, true);
  satConfigForm.value.syncProducts = asBoolean(values.syncProducts, true);
  satConfigForm.value.clientSecret = "";
};

const normalizeFolderInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "/CRM";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const applyNextcloudConfigOverview = (
  overview: IntegrationConfigOverviewResponse,
): void => {
  const values = overview.values;
  const secrets = overview.secrets;

  nextcloudStoredSecrets.value = {
    appPassword: Boolean(secrets.appPassword),
    password: Boolean(secrets.password),
  };

  nextcloudConfigForm.value.baseUrl = asString(values.baseUrl);
  nextcloudConfigForm.value.username = asString(values.username);
  nextcloudConfigForm.value.defaultFolder = normalizeFolderInput(
    asString(values.defaultFolder),
  );
  nextcloudConfigForm.value.appPassword = "";
  nextcloudConfigForm.value.password = "";

  const authModeValue = asString(values.authMode);
  if (authModeValue === "app_password" || authModeValue === "password") {
    nextcloudConfigForm.value.authMode = authModeValue;
    return;
  }

  nextcloudConfigForm.value.authMode = nextcloudStoredSecrets.value.appPassword
    ? "app_password"
    : "password";
};

const applyZimbraConfigOverview = (
  overview: IntegrationConfigOverviewResponse,
): void => {
  const values = overview.values;
  const secrets = overview.secrets;

  zimbraStoredSecrets.value = {
    password: Boolean(secrets.password),
  };

  zimbraConfigForm.value.baseUrl = asString(values.baseUrl);
  zimbraConfigForm.value.username = asString(values.username);
  zimbraConfigForm.value.password = "";
};

const applyOutlookConfigOverview = (
  overview: IntegrationConfigOverviewResponse,
): void => {
  const values = overview.values;
  const secrets = overview.secrets;

  outlookStoredSecrets.value = {
    clientSecret: Boolean(secrets.clientSecret),
  };

  outlookConfigForm.value.tenantId = asString(values.tenantId);
  outlookConfigForm.value.clientId = asString(values.clientId);
  outlookConfigForm.value.clientSecret = "";
};

const applyWhatsAppConfigOverview = (
  overview: IntegrationConfigOverviewResponse,
): void => {
  const values = overview.values;
  const secrets = overview.secrets;

  whatsappStoredSecrets.value = {
    accessToken: Boolean(secrets.accessToken),
  };

  whatsappConfigForm.value.accessToken = "";
  whatsappConfigForm.value.businessAccountId = asString(values.businessAccountId);
  whatsappConfigForm.value.phoneNumberId = asString(values.phoneNumberId);
  whatsappConfigForm.value.apiVersion = asString(values.apiVersion) || "v18.0";
};

const loadConfigOverview = async (
  integrationId:
    | "glpi"
    | "sat"
    | "nextcloud"
    | "zimbra"
    | "outlook"
    | "whatsapp",
) => {
  configOverviewLoading.value = integrationId;
  try {
    const overview =
      await IntegrationsApiService.getConfigOverview(integrationId);
    if (integrationId === "glpi") {
      applyGlpiConfigOverview(overview);
      return;
    }
    if (integrationId === "sat") {
      applySatConfigOverview(overview);
      return;
    }
    if (integrationId === "nextcloud") {
      applyNextcloudConfigOverview(overview);
      return;
    }
    if (integrationId === "zimbra") {
      applyZimbraConfigOverview(overview);
      return;
    }
    if (integrationId === "outlook") {
      applyOutlookConfigOverview(overview);
      return;
    }
    applyWhatsAppConfigOverview(overview);
  } catch (error) {
    if (integrationId === "glpi") {
      glpiConfigForm.value = createDefaultGlpiConfigForm();
      glpiStoredSecrets.value = {
        appToken: false,
        userToken: false,
        password: false,
      };
      await AlertService.error(
        "Falha ao carregar configuração GLPI",
        "Não foi possível carregar os dados atuais da integração.",
      );
      return;
    }

    if (integrationId === "sat") {
      satConfigForm.value = createDefaultSatConfigForm();
      satStoredSecrets.value = { clientSecret: false };
      await AlertService.error(
        "Falha ao carregar configuração SAT ERP",
        "Não foi possível carregar os dados atuais da integração.",
      );
      return;
    }

    if (integrationId === "nextcloud") {
      nextcloudConfigForm.value = createDefaultNextcloudConfigForm();
      nextcloudStoredSecrets.value = { appPassword: false, password: false };
      await AlertService.error(
        "Falha ao carregar configuração Nextcloud",
        "Não foi possível carregar os dados atuais da integração.",
      );
      return;
    }

    if (integrationId === "zimbra") {
      zimbraConfigForm.value = createDefaultZimbraConfigForm();
      zimbraStoredSecrets.value = { password: false };
      await AlertService.error(
        "Falha ao carregar configuração Zimbra",
        "Não foi possível carregar os dados atuais da integração.",
      );
      return;
    }

    if (integrationId === "outlook") {
      outlookConfigForm.value = createDefaultOutlookConfigForm();
      outlookStoredSecrets.value = { clientSecret: false };
      await AlertService.error(
        "Falha ao carregar configuração Outlook",
        "Não foi possível carregar os dados atuais da integração.",
      );
      return;
    }

    whatsappConfigForm.value = createDefaultWhatsAppConfigForm();
    whatsappStoredSecrets.value = { accessToken: false };
    await AlertService.error(
      "Falha ao carregar configuração WhatsApp",
      "Não foi possível carregar os dados atuais da integração.",
    );
  } finally {
    if (configOverviewLoading.value === integrationId) {
      configOverviewLoading.value = null;
    }
  }
};

const refreshWhatsAppHealth = async (showError = true): Promise<void> => {
  isWhatsAppHealthLoading.value = true;
  try {
    whatsappHealth.value = await IntegrationsApiService.checkHealth("whatsapp");
  } catch (error) {
    whatsappHealth.value = null;
    if (showError) {
      await AlertService.error(
        "Falha ao consultar saúde da integração",
        "Não foi possível obter o diagnóstico atual do WhatsApp.",
      );
    }
  } finally {
    isWhatsAppHealthLoading.value = false;
  }
};

const pollSyncJobUntilTerminal = async (
  jobId: string,
  maxPolls = 20,
  intervalMs = 1500,
): Promise<IntegrationSyncJobResponse | null> => {
  let latest: IntegrationSyncJobResponse | null = null;

  for (let poll = 1; poll <= maxPolls; poll += 1) {
    latest = await IntegrationsApiService.getSyncJob(jobId);
    whatsappSyncJob.value = latest;
    if (latest.status === "succeeded" || latest.status === "failed") {
      return latest;
    }
    await wait(intervalMs);
  }

  return latest;
};

const triggerWhatsAppSyncNow = async (): Promise<void> => {
  if (!canTriggerWhatsAppSync.value) {
    return;
  }

  actionInProgress.value = "whatsapp-sync";
  isWhatsAppSyncLoading.value = true;
  whatsappSyncHint.value = "";

  try {
    const trigger = await IntegrationsApiService.triggerSync("whatsapp");
    whatsappSyncHint.value = `Sync iniciado (job ${trigger.jobId}). Acompanhando progresso...`;

    const finalJob = await pollSyncJobUntilTerminal(trigger.jobId);
    await mergeStatuses();
    await refreshWhatsAppHealth(false);

    if (!finalJob) {
      await AlertService.error(
        "Sincronização em andamento",
        "O job foi iniciado, mas não foi possível obter o status final no tempo esperado.",
      );
      return;
    }

    if (finalJob.status === "succeeded") {
      await AlertService.success(
        "Sync WhatsApp concluído",
        `Processados ${finalJob.summary.total.processed} registro(s) com sucesso.`,
      );
      return;
    }

    if (finalJob.status === "failed") {
      await AlertService.error(
        "Sync WhatsApp falhou",
        finalJob.lastError || "Verifique credenciais e permissões da Meta API.",
      );
      return;
    }

    await AlertService.success(
      "Sync WhatsApp iniciado",
      "O job ainda está em execução. Consulte o status novamente em instantes.",
    );
  } catch (error) {
    await AlertService.error("Erro ao sincronizar WhatsApp", error);
  } finally {
    isWhatsAppSyncLoading.value = false;
    actionInProgress.value = null;
  }
};

type IntegrationConfigModal = IntegrationConfigFormId;

const closeAllConfigModals = (except?: IntegrationConfigModal): void => {
  isGlpiConfigOpen.value = except === "glpi";
  isSatConfigOpen.value = except === "sat";
  isNextcloudConfigOpen.value = except === "nextcloud";
  isZimbraConfigOpen.value = except === "zimbra";
  isOutlookConfigOpen.value = except === "outlook";
  isWhatsAppConfigOpen.value = except === "whatsapp";
};

const openZimbraConfigModal = async (): Promise<void> => {
  closeAllConfigModals("zimbra");
  await loadConfigOverview("zimbra");
  refreshFormSuggestions("zimbra");
};

const closeZimbraConfigModal = (): void => {
  if (actionInProgress.value === "zimbra-config") {
    return;
  }
  isZimbraConfigOpen.value = false;
};

const openOutlookConfigModal = async (): Promise<void> => {
  closeAllConfigModals("outlook");
  await loadConfigOverview("outlook");
  refreshFormSuggestions("outlook");
};

const closeOutlookConfigModal = (): void => {
  if (actionInProgress.value === "outlook-config") {
    return;
  }
  isOutlookConfigOpen.value = false;
};

const openWhatsAppConfigModal = async (): Promise<void> => {
  closeAllConfigModals("whatsapp");
  whatsappSyncJob.value = null;
  whatsappSyncHint.value = "";
  await Promise.all([
    loadConfigOverview("whatsapp"),
    refreshWhatsAppHealth(false),
  ]);
  refreshFormSuggestions("whatsapp");
};

const closeWhatsAppConfigModal = (): void => {
  if (
    actionInProgress.value === "whatsapp-config" ||
    actionInProgress.value === "whatsapp-sync"
  ) {
    return;
  }
  isWhatsAppConfigOpen.value = false;
};

const validateZimbraConfigForm = (): string | null => {
  if (!zimbraConfigForm.value.baseUrl.trim()) {
    return "Informe a URL base do Zimbra.";
  }
  if (!/^https?:\/\//i.test(zimbraConfigForm.value.baseUrl.trim())) {
    return "A URL do Zimbra deve começar com http:// ou https://.";
  }
  if (!zimbraConfigForm.value.username.trim()) {
    return "Informe o usuário do Zimbra.";
  }
  if (!zimbraConfigForm.value.password.trim() && !zimbraStoredSecrets.value.password) {
    return "Informe a senha do Zimbra.";
  }
  return null;
};

const buildZimbraConfigPayload = (): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    baseUrl: zimbraConfigForm.value.baseUrl.trim(),
    username: zimbraConfigForm.value.username.trim(),
    smtpProfile: "zimbra",
  };
  const password = zimbraConfigForm.value.password.trim();
  if (password) {
    payload.password = password;
  }
  return payload;
};

const saveZimbraConfiguration = async (): Promise<void> => {
  const validationError = validateZimbraConfigForm();
  if (validationError) {
    await AlertService.error("Configuração inválida", validationError);
    return;
  }

  persistFormSuggestions("zimbra", {
    baseUrl: zimbraConfigForm.value.baseUrl,
    username: zimbraConfigForm.value.username,
  });

  actionInProgress.value = "zimbra-config";
  try {
    const payload = buildZimbraConfigPayload();
    await IntegrationsApiService.configure("zimbra", payload);

    const connectionTest = await IntegrationsApiService.testConnection("zimbra");
    await mergeStatuses();

    if (!connectionTest.success) {
      await AlertService.error("Falha ao conectar no Zimbra", connectionTest.message);
      return;
    }

    isZimbraConfigOpen.value = false;
    await AlertService.success(
      "Zimbra configurado",
      "Conexão validada com sucesso usando as credenciais informadas.",
    );
  } catch (error) {
    await AlertService.error("Erro ao salvar configuração Zimbra", error);
  } finally {
    actionInProgress.value = null;
  }
};

const validateOutlookConfigForm = (): string | null => {
  if (!outlookConfigForm.value.tenantId.trim()) {
    return "Informe o Tenant ID do Microsoft 365.";
  }
  if (!outlookConfigForm.value.clientId.trim()) {
    return "Informe o Client ID do aplicativo.";
  }
  if (
    !outlookConfigForm.value.clientSecret.trim() &&
    !outlookStoredSecrets.value.clientSecret
  ) {
    return "Informe o Client Secret do aplicativo.";
  }
  return null;
};

const buildOutlookConfigPayload = (): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    tenantId: outlookConfigForm.value.tenantId.trim(),
    clientId: outlookConfigForm.value.clientId.trim(),
    smtpProfile: "outlook",
  };
  const clientSecret = outlookConfigForm.value.clientSecret.trim();
  if (clientSecret) {
    payload.clientSecret = clientSecret;
  }
  return payload;
};

const saveOutlookConfiguration = async (): Promise<void> => {
  const validationError = validateOutlookConfigForm();
  if (validationError) {
    await AlertService.error("Configuração inválida", validationError);
    return;
  }

  persistFormSuggestions("outlook", {
    tenantId: outlookConfigForm.value.tenantId,
    clientId: outlookConfigForm.value.clientId,
  });

  actionInProgress.value = "outlook-config";
  try {
    const payload = buildOutlookConfigPayload();
    await IntegrationsApiService.configure("outlook", payload);

    const connectionTest = await IntegrationsApiService.testConnection("outlook");
    await mergeStatuses();

    if (!connectionTest.success) {
      await AlertService.error(
        "Falha ao conectar no Microsoft Outlook",
        connectionTest.message,
      );
      return;
    }

    isOutlookConfigOpen.value = false;
    await AlertService.success(
      "Outlook configurado",
      "Conexão validada com sucesso usando as credenciais informadas.",
    );
  } catch (error) {
    await AlertService.error("Erro ao salvar configuração Outlook", error);
  } finally {
    actionInProgress.value = null;
  }
};

const validateWhatsAppConfigForm = (): string | null => {
  if (
    !whatsappConfigForm.value.accessToken.trim() &&
    !whatsappStoredSecrets.value.accessToken
  ) {
    return "Informe o Access Token da API da Meta.";
  }
  if (!whatsappConfigForm.value.businessAccountId.trim()) {
    return "Informe o ID da conta WhatsApp Business.";
  }
  if (
    whatsappConfigForm.value.apiVersion.trim() &&
    !/^v\d+\.\d+$/i.test(whatsappConfigForm.value.apiVersion.trim())
  ) {
    return "A versão da API deve seguir o formato v18.0.";
  }
  return null;
};

const buildWhatsAppConfigPayload = (): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    businessAccountId: whatsappConfigForm.value.businessAccountId.trim(),
    apiVersion: whatsappConfigForm.value.apiVersion.trim() || "v18.0",
  };

  const accessToken = whatsappConfigForm.value.accessToken.trim();
  if (accessToken) {
    payload.accessToken = accessToken;
  }

  const phoneNumberId = whatsappConfigForm.value.phoneNumberId.trim();
  if (phoneNumberId) {
    payload.phoneNumberId = phoneNumberId;
  }

  return payload;
};

const saveWhatsAppConfiguration = async (): Promise<void> => {
  const validationError = validateWhatsAppConfigForm();
  if (validationError) {
    await AlertService.error("Configuração inválida", validationError);
    return;
  }

  persistFormSuggestions("whatsapp", {
    businessAccountId: whatsappConfigForm.value.businessAccountId,
    phoneNumberId: whatsappConfigForm.value.phoneNumberId,
    apiVersion: whatsappConfigForm.value.apiVersion,
  });

  actionInProgress.value = "whatsapp-config";
  try {
    const payload = buildWhatsAppConfigPayload();
    await IntegrationsApiService.configure("whatsapp", payload);

    const connectionTest = await IntegrationsApiService.testConnection("whatsapp");
    await mergeStatuses();
    await refreshWhatsAppHealth(false);

    if (!connectionTest.success) {
      await AlertService.error(
        "Falha ao conectar no WhatsApp Business",
        connectionTest.message,
      );
      return;
    }

    whatsappSyncHint.value =
      "Conexão validada. Execute o sync para carregar templates e analytics.";
    isWhatsAppConfigOpen.value = false;
    await AlertService.success(
      "WhatsApp configurado",
      "Conexão validada com sucesso. O próximo passo é executar o sync para puxar templates/analytics.",
    );
  } catch (error) {
    await AlertService.error("Erro ao salvar configuração WhatsApp", error);
  } finally {
    actionInProgress.value = null;
  }
};

const openGlpiConfigModal = async (): Promise<void> => {
  closeAllConfigModals("glpi");
  await loadConfigOverview("glpi");
  refreshFormSuggestions("glpi");
};

const closeGlpiConfigModal = (): void => {
  if (actionInProgress.value === "glpi-config") {
    return;
  }
  isGlpiConfigOpen.value = false;
};

const openSatConfigModal = async (): Promise<void> => {
  closeAllConfigModals("sat");
  await loadConfigOverview("sat");
  refreshFormSuggestions("sat");
};

const closeSatConfigModal = (): void => {
  if (actionInProgress.value === "sat-config") {
    return;
  }
  isSatConfigOpen.value = false;
};

const openNextcloudConfigModal = async (): Promise<void> => {
  closeAllConfigModals("nextcloud");
  await loadConfigOverview("nextcloud");
  refreshFormSuggestions("nextcloud");
};

const closeNextcloudConfigModal = (): void => {
  if (actionInProgress.value === "nextcloud-config") {
    return;
  }
  isNextcloudConfigOpen.value = false;
};

const validateGlpiConfigForm = (): string | null => {
  if (!glpiConfigForm.value.baseUrl.trim()) {
    return "Informe a URL base do GLPI.";
  }
  if (!/^https?:\/\//i.test(glpiConfigForm.value.baseUrl.trim())) {
    return "A URL do GLPI deve começar com http:// ou https://.";
  }
  if (!glpiConfigForm.value.appToken.trim() && !glpiStoredSecrets.value.appToken) {
    return "Informe o App-Token do GLPI.";
  }

  if (glpiConfigForm.value.authMode === "user_token") {
    if (
      !glpiConfigForm.value.userToken.trim() &&
      !glpiStoredSecrets.value.userToken
    ) {
      return "Informe o User-Token do GLPI.";
    }
    return null;
  }

  if (!glpiConfigForm.value.username.trim()) {
    return "Informe o usuário do GLPI.";
  }
  if (
    !glpiConfigForm.value.password.trim() &&
    !glpiStoredSecrets.value.password
  ) {
    return "Informe a senha do GLPI.";
  }
  return null;
};

const buildGlpiConfigPayload = (): Record<string, string> => {
  const form = glpiConfigForm.value;
  const payload: Record<string, string> = {
    baseUrl: form.baseUrl.trim(),
  };

  const appToken = form.appToken.trim();
  if (appToken) {
    payload.appToken = appToken;
  }

  if (form.authMode === "user_token") {
    const userToken = form.userToken.trim();
    if (userToken) {
      payload.userToken = userToken;
    }
    payload.username = "";
    payload.password = "";
    return payload;
  }

  payload.username = form.username.trim();
  const password = form.password.trim();
  if (password) {
    payload.password = password;
  }
  payload.userToken = "";
  return payload;
};

const saveGlpiConfiguration = async (): Promise<void> => {
  const validationError = validateGlpiConfigForm();
  if (validationError) {
    await AlertService.error("Configuração inválida", validationError);
    return;
  }

  persistFormSuggestions("glpi", {
    baseUrl: glpiConfigForm.value.baseUrl,
    username: glpiConfigForm.value.username,
  });

  actionInProgress.value = "glpi-config";
  try {
    const payload = buildGlpiConfigPayload();
    await IntegrationsApiService.configure("glpi", payload);

    const connectionTest = await IntegrationsApiService.testConnection("glpi");
    await mergeStatuses();

    if (!connectionTest.success) {
      await AlertService.error("Falha ao conectar no GLPI", connectionTest.message);
      return;
    }

    isGlpiConfigOpen.value = false;
    await AlertService.success(
      "GLPI configurado",
      "Conexão validada com sucesso usando as credenciais informadas.",
    );
  } catch (error) {
    await AlertService.error("Erro ao salvar configuração GLPI", error);
  } finally {
    actionInProgress.value = null;
  }
};

const validateSatConfigForm = (): string | null => {
  if (!satConfigForm.value.baseUrl.trim()) {
    return "Informe a URL base da API SAT.";
  }
  if (!/^https?:\/\//i.test(satConfigForm.value.baseUrl.trim())) {
    return "A URL da API SAT deve começar com http:// ou https://.";
  }
  if (!satConfigForm.value.clientId.trim()) {
    return "Informe o Client ID do SAT.";
  }
  if (
    !satConfigForm.value.clientSecret.trim() &&
    !satStoredSecrets.value.clientSecret
  ) {
    return "Informe o Client Secret do SAT.";
  }
  if (!satConfigForm.value.companyId.trim()) {
    return "Informe o ID da empresa no SAT.";
  }
  return null;
};

const buildSatConfigPayload = (): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    baseUrl: satConfigForm.value.baseUrl.trim(),
    clientId: satConfigForm.value.clientId.trim(),
    companyId: satConfigForm.value.companyId.trim(),
    syncInvoices: satConfigForm.value.syncInvoices,
    syncProducts: satConfigForm.value.syncProducts,
  };
  const clientSecret = satConfigForm.value.clientSecret.trim();
  if (clientSecret) {
    payload.clientSecret = clientSecret;
  }
  return payload;
};

const saveSatConfiguration = async (): Promise<void> => {
  const validationError = validateSatConfigForm();
  if (validationError) {
    await AlertService.error("Configuração inválida", validationError);
    return;
  }

  persistFormSuggestions("sat", {
    baseUrl: satConfigForm.value.baseUrl,
    clientId: satConfigForm.value.clientId,
    companyId: satConfigForm.value.companyId,
  });

  actionInProgress.value = "sat-config";
  try {
    const payload = buildSatConfigPayload();
    await IntegrationsApiService.configure("sat", payload);

    const connectionTest = await IntegrationsApiService.testConnection("sat");
    await mergeStatuses();

    if (!connectionTest.success) {
      await AlertService.error("Falha ao conectar no SAT ERP", connectionTest.message);
      return;
    }

    isSatConfigOpen.value = false;
    await AlertService.success(
      "SAT ERP configurado",
      "Conexão validada com sucesso usando as credenciais informadas.",
    );
  } catch (error) {
    await AlertService.error("Erro ao salvar configuração SAT ERP", error);
  } finally {
    actionInProgress.value = null;
  }
};

const validateNextcloudConfigForm = (): string | null => {
  if (!nextcloudConfigForm.value.baseUrl.trim()) {
    return "Informe a URL base do Nextcloud.";
  }
  if (!/^https?:\/\//i.test(nextcloudConfigForm.value.baseUrl.trim())) {
    return "A URL do Nextcloud deve começar com http:// ou https://.";
  }
  if (!nextcloudConfigForm.value.username.trim()) {
    return "Informe o usuário do Nextcloud.";
  }
  if (!nextcloudConfigForm.value.defaultFolder.trim()) {
    return "Informe a pasta base do Nextcloud.";
  }

  if (nextcloudConfigForm.value.authMode === "app_password") {
    if (
      !nextcloudConfigForm.value.appPassword.trim() &&
      !nextcloudStoredSecrets.value.appPassword
    ) {
      return "Informe o App Password do Nextcloud.";
    }
    return null;
  }

  if (
    !nextcloudConfigForm.value.password.trim() &&
    !nextcloudStoredSecrets.value.password
  ) {
    return "Informe a senha do Nextcloud.";
  }
  return null;
};

const buildNextcloudConfigPayload = (): Record<string, string> => {
  const form = nextcloudConfigForm.value;
  const payload: Record<string, string> = {
    baseUrl: form.baseUrl.trim(),
    username: form.username.trim(),
    defaultFolder: normalizeFolderInput(form.defaultFolder),
  };

  if (form.authMode === "app_password") {
    const appPassword = form.appPassword.trim();
    if (appPassword) {
      payload.appPassword = appPassword;
    }
    payload.password = "";
    return payload;
  }

  const password = form.password.trim();
  if (password) {
    payload.password = password;
  }
  payload.appPassword = "";
  return payload;
};

const saveNextcloudConfiguration = async (): Promise<void> => {
  const validationError = validateNextcloudConfigForm();
  if (validationError) {
    await AlertService.error("Configuração inválida", validationError);
    return;
  }

  persistFormSuggestions("nextcloud", {
    baseUrl: nextcloudConfigForm.value.baseUrl,
    username: nextcloudConfigForm.value.username,
    defaultFolder: nextcloudConfigForm.value.defaultFolder,
  });

  actionInProgress.value = "nextcloud-config";
  try {
    const payload = buildNextcloudConfigPayload();
    await IntegrationsApiService.configure("nextcloud", payload);

    const connectionTest =
      await IntegrationsApiService.testConnection("nextcloud");
    await mergeStatuses();

    if (!connectionTest.success) {
      await AlertService.error(
        "Falha ao conectar no Nextcloud",
        connectionTest.message,
      );
      return;
    }

    isNextcloudConfigOpen.value = false;
    await AlertService.success(
      "Nextcloud configurado",
      "Conexão validada com sucesso usando as credenciais informadas.",
    );
  } catch (error) {
    await AlertService.error("Erro ao salvar configuração Nextcloud", error);
  } finally {
    actionInProgress.value = null;
  }
};

const toggleExpand = (id: string) => {
  if (expandedCards.value.has(id)) {
    expandedCards.value.delete(id);
  } else {
    expandedCards.value.add(id);
  }
};

const isExpanded = (id: string) => expandedCards.value.has(id);

const connectedCount = computed(
  () => integrations.value.filter((i) => i.status === "connected").length,
);

const configuredCount = computed(
  () => integrations.value.filter((i) => i.configured).length,
);

const hasGlpiStoredSecrets = computed(
  () =>
    glpiStoredSecrets.value.appToken ||
    glpiStoredSecrets.value.userToken ||
    glpiStoredSecrets.value.password,
);

const hasNextcloudStoredSecrets = computed(
  () =>
    nextcloudStoredSecrets.value.appPassword ||
    nextcloudStoredSecrets.value.password,
);

const hasZimbraStoredSecrets = computed(() => zimbraStoredSecrets.value.password);

const hasOutlookStoredSecrets = computed(
  () => outlookStoredSecrets.value.clientSecret,
);

const hasWhatsAppStoredSecrets = computed(
  () => whatsappStoredSecrets.value.accessToken,
);

const integrationLookupById = computed(() => {
  const byId = new Map<string, Integration>();
  for (const integration of integrations.value) {
    byId.set(integration.id, integration);
  }
  return byId;
});

const primaryHelpIntegrationId = computed(() => {
  const first = integrations.value[0]?.id;
  return IntegrationHelpCatalogService.has(first) ? first || "glpi" : "glpi";
});

const activeIntegrationHelp = computed<IntegrationHelpEntry | null>(() =>
  IntegrationHelpCatalogService.get(activeIntegrationHelpId.value),
);

const activeHelpIntegrationName = computed(() => {
  const helpEntry = activeIntegrationHelp.value;
  if (!helpEntry) return "";
  return (
    integrationLookupById.value.get(helpEntry.integrationId)?.name
    || helpEntry.integrationName
  );
});

const whatsappHealthInfo = computed<Record<string, unknown> | null>(() => {
  const details = whatsappHealth.value?.details;
  if (!details?.info) {
    return null;
  }

  const rootInfo = asRecord(details.info);
  if (!rootInfo) {
    return null;
  }

  return asRecord(rootInfo.whatsapp);
});

const whatsappSetupChecklist = computed<WhatsAppSetupChecklistItem[]>(() => {
  const setup = whatsappHealthInfo.value?.setup;
  if (!Array.isArray(setup)) {
    return [];
  }

  const items: WhatsAppSetupChecklistItem[] = [];
  for (const entry of setup) {
    const record = asRecord(entry);
    if (!record) continue;

    const key = asString(record.key);
    const label = asString(record.label);
    if (!key || !label) continue;

    const required = asBoolean(record.required, false);
    const present = asBoolean(record.present, false);
    const note = asString(record.note);

    items.push({
      key,
      label,
      required,
      present,
      note: note || undefined,
    });
  }

  return items;
});

const whatsappMissingRequiredFields = computed(() =>
  asStringArray(whatsappHealthInfo.value?.missingRequired),
);

const whatsappHealthIssues = computed(() =>
  asStringArray(whatsappHealthInfo.value?.issues),
);

const whatsappNextStep = computed(() =>
  asString(whatsappHealthInfo.value?.nextStep),
);

const whatsappHealthStatusLabel = computed(() => {
  const status = whatsappHealth.value?.status;
  if (status === "healthy") return "Saudável";
  if (status === "degraded") return "Degradado";
  if (status === "unhealthy") return "Não saudável";
  return "Indisponível";
});

const whatsappSyncStatusLabel = computed(() => {
  const status = whatsappSyncJob.value?.status;
  if (status === "queued") return "Na fila";
  if (status === "running") return "Executando";
  if (status === "retrying") return "Tentando novamente";
  if (status === "succeeded") return "Concluído";
  if (status === "failed") return "Falhou";
  return "";
});

const whatsappSyncSummaryLabel = computed(() => {
  const total = whatsappSyncJob.value?.summary?.total;
  if (!total) return "";
  return (
    `Processados: ${total.processed}. ` +
    `Criados: ${total.created}. ` +
    `Atualizados: ${total.updated}. ` +
    `Sem alteração: ${total.unchanged}. ` +
    `Falhas: ${total.failed}.`
  );
});

const canTriggerWhatsAppSync = computed(
  () =>
    whatsappHealth.value?.configured === true &&
    !isWhatsAppHealthLoading.value &&
    actionInProgress.value !== "whatsapp-sync" &&
    !isWhatsAppSyncLoading.value,
);

const openIntegrationHelpByTriggerId = async (
  triggerElementId: string,
): Promise<void> => {
  const triggerElement = document.getElementById(triggerElementId);
  if (!(triggerElement instanceof HTMLElement)) {
    return;
  }

  const triggerDataset: DOMStringMap = triggerElement.dataset;
  const integrationId = (triggerDataset.integrationId || "").trim().toLowerCase();
  if (!IntegrationHelpCatalogService.has(integrationId)) {
    await AlertService.error(
      "Ajuda indisponível",
      "Nao foi possivel localizar o guia dessa integracao.",
    );
    return;
  }

  if (!triggerElement.id) {
    triggerElement.id = `integration-help-trigger-${integrationId}`;
  }

  activeHelpTriggerElementId.value = triggerElement.id;
  activeIntegrationHelpId.value = integrationId;
  isIntegrationHelpOpen.value = true;
};

const openIntegrationHelpFromTrigger = async (
  event: MouseEvent,
): Promise<void> => {
  const triggerElement = event.currentTarget;
  if (!(triggerElement instanceof HTMLElement)) {
    return;
  }

  if (!triggerElement.id) {
    const fallbackId =
      triggerElement.dataset.integrationId?.trim().toLowerCase() || "generic";
    triggerElement.id = `integration-help-trigger-${fallbackId}`;
  }

  await openIntegrationHelpByTriggerId(triggerElement.id);
};

const openIntegrationHelpFromCardAction = async (
  payload: IntegrationHelpTriggerPayload,
): Promise<void> => {
  if (!payload.triggerElementId.trim()) {
    return;
  }
  await openIntegrationHelpByTriggerId(payload.triggerElementId.trim());
};

const closeIntegrationHelpModal = (): void => {
  isIntegrationHelpOpen.value = false;
  const triggerId = activeHelpTriggerElementId.value;
  if (triggerId) {
    requestAnimationFrame(() => {
      const trigger = document.getElementById(triggerId);
      if (trigger instanceof HTMLElement) {
        trigger.focus();
      }
      activeIntegrationHelpId.value = null;
      activeHelpTriggerElementId.value = "";
    });
    return;
  }

  activeIntegrationHelpId.value = null;
  activeHelpTriggerElementId.value = "";
};

const openConfig = async (integration: Integration): Promise<void> => {
  if (integration.id === "glpi") {
    await openGlpiConfigModal();
    return;
  }

  if (integration.id === "sat") {
    await openSatConfigModal();
    return;
  }

  if (integration.id === "nextcloud") {
    await openNextcloudConfigModal();
    return;
  }

  if (integration.id === "zimbra") {
    await openZimbraConfigModal();
    return;
  }

  if (integration.id === "outlook") {
    await openOutlookConfigModal();
    return;
  }

  if (integration.id === "whatsapp") {
    await openWhatsAppConfigModal();
    return;
  }

  await AlertService.success(
    "Configuração em breve",
    `A configuração guiada de ${integration.name} ainda não está disponível nesta versão.`,
  );
};

const testConnection = async (integration: Integration) => {
  actionInProgress.value = integration.id;
  try {
    const result = await IntegrationsApiService.testConnection(integration.id);
    await mergeStatuses();

    if (result.success) {
      await AlertService.success(
        `Conexão com ${integration.name} validada`,
        result.message,
      );
      return;
    }

    await AlertService.error(`Conexão com ${integration.name} falhou`, result.message);
  } catch (error) {
    await AlertService.error(`Erro ao testar ${integration.name}`, error);
  } finally {
    actionInProgress.value = null;
  }
};

onMounted(async () => {
  await mergeStatuses();
  refreshFormSuggestions("glpi");
  refreshFormSuggestions("sat");
  refreshFormSuggestions("nextcloud");
  refreshFormSuggestions("zimbra");
  refreshFormSuggestions("outlook");
  refreshFormSuggestions("whatsapp");
});

onBeforeUnmount(() => {
  integrationAutocomplete.cancelAll();
});
</script>

<template>
  <main
    id="integrations-page-root"
    class="integrations-page"
    aria-labelledby="integrations-title"
    data-view-id="integrations-dashboard"
  >
    <header class="page-header">
      <div class="header-content">
        <h1 id="integrations-title" class="page-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="title-icon"
            aria-hidden="true"
          >
            <path
              v-for="(pathData, pathIndex) in BOOTSTRAP_LINK_45_DEG_ICON_PATHS"
              :key="`integrations-title-icon-path-${pathIndex}`"
              :d="pathData"
            />
          </svg>
          Integrações
        </h1>
        <p class="page-subtitle">
          Conecte o CRM com sistemas externos para automatizar fluxos de
          trabalho
        </p>
        <div
          class="header-actions"
          role="group"
          aria-label="Acoes de ajuda da tela de integracoes"
        >
          <button
            id="integration-help-trigger-main"
            class="btn btn-ghost btn-sm integrations-help-btn"
            type="button"
            title="Abrir guia de ajuda para integracoes"
            aria-label="Abrir guia de ajuda para integracoes"
            data-help-target="integration-help-modal"
            :data-integration-id="primaryHelpIntegrationId"
            data-help-scope="dashboard"
            @click="openIntegrationHelpFromTrigger"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="integrations-help-btn__icon"
              aria-hidden="true"
            >
              <path
                v-for="(pathData, pathIndex) in BOOTSTRAP_QUESTION_CIRCLE_ICON_PATHS"
                :key="`main-help-question-path-${pathIndex}`"
                :d="pathData"
              />
            </svg>
            Ajuda
          </button>
        </div>
      </div>

      <div
        class="header-stats"
        role="group"
        aria-label="Estatísticas de integrações"
      >
        <div class="stat-card" title="Total de integrações disponíveis">
          <span class="stat-value" aria-label="Disponíveis">{{
            integrations.length
          }}</span>
          <span class="stat-label">Disponíveis</span>
        </div>
        <div class="stat-card" title="Integrações configuradas">
          <span class="stat-value" aria-label="Configuradas">{{
            configuredCount
          }}</span>
          <span class="stat-label">Configuradas</span>
        </div>
        <div class="stat-card stat-connected" title="Integrações conectadas">
          <span class="stat-value" aria-label="Conectadas">{{
            connectedCount
          }}</span>
          <span class="stat-label">Conectadas</span>
        </div>
      </div>
    </header>

    <div class="integrations-notice" role="note" aria-live="polite">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        class="notice-icon"
        aria-hidden="true"
      >
        <path
          v-for="(pathData, pathIndex) in BOOTSTRAP_INFO_CIRCLE_ICON_PATHS"
          :key="`integrations-notice-icon-path-${pathIndex}`"
          :d="pathData"
        />
      </svg>
      <p>
        <strong
          >GLPI, SAT ERP, Nextcloud, Zimbra, Outlook e WhatsApp em modo
          real:</strong
        >
        essas integrações aceitam configuração manual nesta tela. As
        credenciais informadas são salvas no backend e não dependem de
        variáveis de ambiente.
      </p>
    </div>

    <section
      id="integrations-grid"
      class="integrations-grid"
      aria-label="Lista de integrações disponíveis"
      :data-loading-state="isLoadingIntegrations ? 'loading' : 'idle'"
      role="list"
    >
      <p v-if="isLoadingIntegrations" class="integrations-loading" role="status">
        Carregando integrações...
      </p>
      <IntegrationCard
        v-for="integration in integrations"
        :key="integration.id"
        :integration="integration"
        :is-expanded="isExpanded(integration.id)"
        @toggle="toggleExpand(integration.id)"
        @configure="openConfig(integration)"
        @test="testConnection(integration)"
        @help="openIntegrationHelpFromCardAction"
      />
    </section>

    <IntegrationHelpModal
      :open="isIntegrationHelpOpen"
      :entry="activeIntegrationHelp"
      :integration-name="activeHelpIntegrationName"
      @close="closeIntegrationHelpModal"
    />

    <Teleport to="body">
      <div
        v-if="isGlpiConfigOpen"
        class="glpi-config-backdrop"
        role="presentation"
        @click.self="closeGlpiConfigModal"
      >
        <section
          class="glpi-config-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="glpi-config-title"
        >
          <header class="glpi-config-header">
            <h2 id="glpi-config-title">Configurar GLPI</h2>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              title="Fechar configuração GLPI"
              :disabled="
                actionInProgress === 'glpi-config' ||
                configOverviewLoading === 'glpi'
              "
              @click="closeGlpiConfigModal"
            >
              Fechar
            </button>
          </header>

          <form
            :id="integrationConfigFormElementId('glpi')"
            class="glpi-config-form"
            data-form-id="glpi"
            @submit.prevent="saveGlpiConfiguration"
          >
            <p v-if="configOverviewLoading === 'glpi'" class="glpi-config-banner">
              Carregando configuração atual...
            </p>
            <p v-else-if="hasGlpiStoredSecrets" class="glpi-config-banner">
              Configuração existente detectada. Campos de segredo podem ficar
              vazios para manter os valores atuais.
            </p>

            <label class="glpi-config-field">
              <span>URL Base do GLPI</span>
              <input
                v-model="glpiConfigForm.baseUrl"
                type="url"
                placeholder="https://glpi.suaempresa.com"
                :id="integrationConfigInputElementId('glpi', 'baseUrl')"
                data-form-id="glpi"
                data-input-id="baseUrl"
                :list="integrationConfigDatalistId('glpi', 'baseUrl')"
                autocomplete="section-glpi url"
                @input="
                  trackInputValueForSuggestions(
                    'glpi',
                    'baseUrl',
                    glpiConfigForm.baseUrl,
                  )
                "
              />
              <datalist :id="integrationConfigDatalistId('glpi', 'baseUrl')">
                <option
                  v-for="option in getInputSuggestions('glpi', 'baseUrl')"
                  :key="`glpi-baseUrl-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <label class="glpi-config-field">
              <span>App-Token</span>
              <input
                v-model="glpiConfigForm.appToken"
                type="password"
                :placeholder="
                  glpiStoredSecrets.appToken
                    ? '******** (mantido se vazio)'
                    : 'Token da aplicação GLPI'
                "
                autocomplete="off"
              />
              <small v-if="glpiStoredSecrets.appToken" class="glpi-config-help">
                App-Token já salvo. Preencha apenas para substituir.
              </small>
            </label>

            <fieldset class="glpi-config-auth">
              <legend>Método de autenticação</legend>
              <label>
                <input
                  v-model="glpiConfigForm.authMode"
                  type="radio"
                  value="user_token"
                />
                User-Token
              </label>
              <label>
                <input v-model="glpiConfigForm.authMode" type="radio" value="basic" />
                Usuário e senha
              </label>
            </fieldset>

            <label v-if="glpiConfigForm.authMode === 'user_token'" class="glpi-config-field">
              <span>User-Token</span>
              <input
                v-model="glpiConfigForm.userToken"
                type="password"
                :placeholder="
                  glpiStoredSecrets.userToken
                    ? '******** (mantido se vazio)'
                    : 'Token do usuário GLPI'
                "
                autocomplete="off"
              />
              <small v-if="glpiStoredSecrets.userToken" class="glpi-config-help">
                User-Token já salvo. Preencha apenas para substituir.
              </small>
            </label>

            <div v-else class="glpi-config-grid">
              <label class="glpi-config-field">
                <span>Usuário</span>
                <input
                  v-model="glpiConfigForm.username"
                  type="text"
                  placeholder="Usuário do GLPI"
                  :id="integrationConfigInputElementId('glpi', 'username')"
                  data-form-id="glpi"
                  data-input-id="username"
                  :list="integrationConfigDatalistId('glpi', 'username')"
                  autocomplete="section-glpi username"
                  @input="
                    trackInputValueForSuggestions(
                      'glpi',
                      'username',
                      glpiConfigForm.username,
                    )
                  "
                />
                <datalist :id="integrationConfigDatalistId('glpi', 'username')">
                  <option
                    v-for="option in getInputSuggestions('glpi', 'username')"
                    :key="`glpi-username-${option}`"
                    :value="option"
                  />
                </datalist>
              </label>

              <label class="glpi-config-field">
                <span>Senha</span>
                <input
                  v-model="glpiConfigForm.password"
                  type="password"
                  :placeholder="
                    glpiStoredSecrets.password
                      ? '******** (mantida se vazio)'
                      : 'Senha do usuário GLPI'
                  "
                  autocomplete="section-glpi current-password"
                />
                <small v-if="glpiStoredSecrets.password" class="glpi-config-help">
                  Senha já salva. Preencha apenas para substituir.
                </small>
              </label>
            </div>

            <footer class="glpi-config-actions">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="
                  actionInProgress === 'glpi-config' ||
                  configOverviewLoading === 'glpi'
                "
                @click="closeGlpiConfigModal"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="
                  actionInProgress === 'glpi-config' ||
                  configOverviewLoading === 'glpi'
                "
              >
                {{
                  actionInProgress === "glpi-config"
                    ? "Salvando..."
                    : "Salvar e testar conexão"
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>

      <div
        v-if="isSatConfigOpen"
        class="glpi-config-backdrop"
        role="presentation"
        @click.self="closeSatConfigModal"
      >
        <section
          class="glpi-config-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sat-config-title"
        >
          <header class="glpi-config-header">
            <h2 id="sat-config-title">Configurar SAT ERP</h2>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              title="Fechar configuração SAT ERP"
              :disabled="
                actionInProgress === 'sat-config' ||
                configOverviewLoading === 'sat'
              "
              @click="closeSatConfigModal"
            >
              Fechar
            </button>
          </header>

          <form
            :id="integrationConfigFormElementId('sat')"
            class="glpi-config-form"
            data-form-id="sat"
            @submit.prevent="saveSatConfiguration"
          >
            <p v-if="configOverviewLoading === 'sat'" class="glpi-config-banner">
              Carregando configuração atual...
            </p>
            <p
              v-else-if="satStoredSecrets.clientSecret"
              class="glpi-config-banner"
            >
              Configuração existente detectada. O Client Secret pode ficar vazio
              para manter o valor atual.
            </p>

            <label class="glpi-config-field">
              <span>URL Base da API SAT</span>
              <input
                v-model="satConfigForm.baseUrl"
                type="url"
                placeholder="https://api.sat.empresa.com.br"
                :id="integrationConfigInputElementId('sat', 'baseUrl')"
                data-form-id="sat"
                data-input-id="baseUrl"
                :list="integrationConfigDatalistId('sat', 'baseUrl')"
                autocomplete="section-sat url"
                @input="
                  trackInputValueForSuggestions(
                    'sat',
                    'baseUrl',
                    satConfigForm.baseUrl,
                  )
                "
              />
              <datalist :id="integrationConfigDatalistId('sat', 'baseUrl')">
                <option
                  v-for="option in getInputSuggestions('sat', 'baseUrl')"
                  :key="`sat-baseUrl-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <div class="glpi-config-grid">
              <label class="glpi-config-field">
                <span>Client ID</span>
                <input
                  v-model="satConfigForm.clientId"
                  type="text"
                  placeholder="Client ID OAuth2"
                  :id="integrationConfigInputElementId('sat', 'clientId')"
                  data-form-id="sat"
                  data-input-id="clientId"
                  :list="integrationConfigDatalistId('sat', 'clientId')"
                  autocomplete="off"
                  @input="
                    trackInputValueForSuggestions(
                      'sat',
                      'clientId',
                      satConfigForm.clientId,
                    )
                  "
                />
                <datalist :id="integrationConfigDatalistId('sat', 'clientId')">
                  <option
                    v-for="option in getInputSuggestions('sat', 'clientId')"
                    :key="`sat-clientId-${option}`"
                    :value="option"
                  />
                </datalist>
              </label>

              <label class="glpi-config-field">
                <span>Client Secret</span>
                <input
                  v-model="satConfigForm.clientSecret"
                  type="password"
                  :placeholder="
                    satStoredSecrets.clientSecret
                      ? '******** (mantido se vazio)'
                      : 'Client Secret OAuth2'
                  "
                  autocomplete="off"
                />
                <small v-if="satStoredSecrets.clientSecret" class="glpi-config-help">
                  Client Secret já salvo. Preencha apenas para substituir.
                </small>
              </label>
            </div>

            <label class="glpi-config-field">
              <span>ID da Empresa no SAT</span>
              <input
                v-model="satConfigForm.companyId"
                type="text"
                placeholder="Código da empresa no SAT"
                :id="integrationConfigInputElementId('sat', 'companyId')"
                data-form-id="sat"
                data-input-id="companyId"
                :list="integrationConfigDatalistId('sat', 'companyId')"
                autocomplete="off"
                @input="
                  trackInputValueForSuggestions(
                    'sat',
                    'companyId',
                    satConfigForm.companyId,
                  )
                "
              />
              <datalist :id="integrationConfigDatalistId('sat', 'companyId')">
                <option
                  v-for="option in getInputSuggestions('sat', 'companyId')"
                  :key="`sat-companyId-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <fieldset class="glpi-config-auth">
              <legend>Sincronização inicial</legend>
              <label>
                <input v-model="satConfigForm.syncInvoices" type="checkbox" />
                Sincronizar notas fiscais
              </label>
              <label>
                <input v-model="satConfigForm.syncProducts" type="checkbox" />
                Sincronizar produtos
              </label>
            </fieldset>

            <footer class="glpi-config-actions">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="
                  actionInProgress === 'sat-config' ||
                  configOverviewLoading === 'sat'
                "
                @click="closeSatConfigModal"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="
                  actionInProgress === 'sat-config' ||
                  configOverviewLoading === 'sat'
                "
              >
                {{
                  actionInProgress === "sat-config"
                    ? "Salvando..."
                    : "Salvar e testar conexão"
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>

      <div
        v-if="isNextcloudConfigOpen"
        class="glpi-config-backdrop"
        role="presentation"
        @click.self="closeNextcloudConfigModal"
      >
        <section
          class="glpi-config-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nextcloud-config-title"
        >
          <header class="glpi-config-header">
            <h2 id="nextcloud-config-title">Configurar Nextcloud</h2>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              title="Fechar configuração Nextcloud"
              :disabled="
                actionInProgress === 'nextcloud-config' ||
                configOverviewLoading === 'nextcloud'
              "
              @click="closeNextcloudConfigModal"
            >
              Fechar
            </button>
          </header>

          <form
            :id="integrationConfigFormElementId('nextcloud')"
            class="glpi-config-form"
            data-form-id="nextcloud"
            @submit.prevent="saveNextcloudConfiguration"
          >
            <p
              v-if="configOverviewLoading === 'nextcloud'"
              class="glpi-config-banner"
            >
              Carregando configuração atual...
            </p>
            <p v-else-if="hasNextcloudStoredSecrets" class="glpi-config-banner">
              Configuração existente detectada. O segredo de autenticação pode
              ficar vazio para manter o valor atual.
            </p>

            <label class="glpi-config-field">
              <span>URL Base do Nextcloud</span>
              <input
                v-model="nextcloudConfigForm.baseUrl"
                type="url"
                placeholder="https://cloud.suaempresa.com"
                :id="integrationConfigInputElementId('nextcloud', 'baseUrl')"
                data-form-id="nextcloud"
                data-input-id="baseUrl"
                :list="integrationConfigDatalistId('nextcloud', 'baseUrl')"
                autocomplete="section-nextcloud url"
                @input="
                  trackInputValueForSuggestions(
                    'nextcloud',
                    'baseUrl',
                    nextcloudConfigForm.baseUrl,
                  )
                "
              />
              <datalist :id="integrationConfigDatalistId('nextcloud', 'baseUrl')">
                <option
                  v-for="option in getInputSuggestions('nextcloud', 'baseUrl')"
                  :key="`nextcloud-baseUrl-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <div class="glpi-config-grid">
              <label class="glpi-config-field">
                <span>Usuário</span>
                <input
                  v-model="nextcloudConfigForm.username"
                  type="text"
                  placeholder="Usuário do Nextcloud"
                  :id="integrationConfigInputElementId('nextcloud', 'username')"
                  data-form-id="nextcloud"
                  data-input-id="username"
                  :list="integrationConfigDatalistId('nextcloud', 'username')"
                  autocomplete="section-nextcloud username"
                  @input="
                    trackInputValueForSuggestions(
                      'nextcloud',
                      'username',
                      nextcloudConfigForm.username,
                    )
                  "
                />
                <datalist :id="integrationConfigDatalistId('nextcloud', 'username')">
                  <option
                    v-for="option in getInputSuggestions('nextcloud', 'username')"
                    :key="`nextcloud-username-${option}`"
                    :value="option"
                  />
                </datalist>
              </label>

              <label class="glpi-config-field">
                <span>Pasta Base</span>
                <input
                  v-model="nextcloudConfigForm.defaultFolder"
                  type="text"
                  placeholder="/CRM"
                  :id="
                    integrationConfigInputElementId('nextcloud', 'defaultFolder')
                  "
                  data-form-id="nextcloud"
                  data-input-id="defaultFolder"
                  :list="integrationConfigDatalistId('nextcloud', 'defaultFolder')"
                  autocomplete="off"
                  @input="
                    trackInputValueForSuggestions(
                      'nextcloud',
                      'defaultFolder',
                      nextcloudConfigForm.defaultFolder,
                    )
                  "
                />
                <datalist
                  :id="integrationConfigDatalistId('nextcloud', 'defaultFolder')"
                >
                  <option
                    v-for="option in getInputSuggestions('nextcloud', 'defaultFolder')"
                    :key="`nextcloud-defaultFolder-${option}`"
                    :value="option"
                  />
                </datalist>
              </label>
            </div>

            <fieldset class="glpi-config-auth">
              <legend>Método de autenticação</legend>
              <label>
                <input
                  v-model="nextcloudConfigForm.authMode"
                  type="radio"
                  value="app_password"
                />
                App Password
              </label>
              <label>
                <input
                  v-model="nextcloudConfigForm.authMode"
                  type="radio"
                  value="password"
                />
                Senha do usuário
              </label>
            </fieldset>

            <label
              v-if="nextcloudConfigForm.authMode === 'app_password'"
              class="glpi-config-field"
            >
              <span>App Password</span>
              <input
                v-model="nextcloudConfigForm.appPassword"
                type="password"
                :placeholder="
                  nextcloudStoredSecrets.appPassword
                    ? '******** (mantido se vazio)'
                    : 'App Password do Nextcloud'
                "
                autocomplete="off"
              />
              <small
                v-if="nextcloudStoredSecrets.appPassword"
                class="glpi-config-help"
              >
                App Password já salvo. Preencha apenas para substituir.
              </small>
            </label>

            <label v-else class="glpi-config-field">
              <span>Senha do usuário</span>
                <input
                  v-model="nextcloudConfigForm.password"
                  type="password"
                  :placeholder="
                    nextcloudStoredSecrets.password
                      ? '******** (mantida se vazio)'
                      : 'Senha da conta Nextcloud'
                  "
                  autocomplete="section-nextcloud current-password"
                />
              <small
                v-if="nextcloudStoredSecrets.password"
                class="glpi-config-help"
              >
                Senha já salva. Preencha apenas para substituir.
              </small>
            </label>

            <footer class="glpi-config-actions">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="
                  actionInProgress === 'nextcloud-config' ||
                  configOverviewLoading === 'nextcloud'
                "
                @click="closeNextcloudConfigModal"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="
                  actionInProgress === 'nextcloud-config' ||
                  configOverviewLoading === 'nextcloud'
                "
              >
                {{
                  actionInProgress === "nextcloud-config"
                    ? "Salvando..."
                    : "Salvar e testar conexão"
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>

      <div
        v-if="isZimbraConfigOpen"
        class="glpi-config-backdrop"
        role="presentation"
        @click.self="closeZimbraConfigModal"
      >
        <section
          class="glpi-config-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="zimbra-config-title"
        >
          <header class="glpi-config-header">
            <h2 id="zimbra-config-title">Configurar Zimbra</h2>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              title="Fechar configuração Zimbra"
              :disabled="
                actionInProgress === 'zimbra-config' ||
                configOverviewLoading === 'zimbra'
              "
              @click="closeZimbraConfigModal"
            >
              Fechar
            </button>
          </header>

          <form
            :id="integrationConfigFormElementId('zimbra')"
            class="glpi-config-form"
            data-form-id="zimbra"
            @submit.prevent="saveZimbraConfiguration"
          >
            <p v-if="configOverviewLoading === 'zimbra'" class="glpi-config-banner">
              Carregando configuração atual...
            </p>
            <p v-else-if="hasZimbraStoredSecrets" class="glpi-config-banner">
              Configuração existente detectada. A senha pode ficar vazia para manter
              o valor atual.
            </p>

            <label class="glpi-config-field">
              <span>URL Base do Zimbra</span>
              <input
                v-model="zimbraConfigForm.baseUrl"
                type="url"
                placeholder="https://mail.suaempresa.com"
                :id="integrationConfigInputElementId('zimbra', 'baseUrl')"
                data-form-id="zimbra"
                data-input-id="baseUrl"
                :list="integrationConfigDatalistId('zimbra', 'baseUrl')"
                autocomplete="section-zimbra url"
                @input="
                  trackInputValueForSuggestions(
                    'zimbra',
                    'baseUrl',
                    zimbraConfigForm.baseUrl,
                  )
                "
              />
              <datalist :id="integrationConfigDatalistId('zimbra', 'baseUrl')">
                <option
                  v-for="option in getInputSuggestions('zimbra', 'baseUrl')"
                  :key="`zimbra-baseUrl-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <label class="glpi-config-field">
              <span>Usuário</span>
              <input
                v-model="zimbraConfigForm.username"
                type="text"
                placeholder="usuario@suaempresa.com"
                :id="integrationConfigInputElementId('zimbra', 'username')"
                data-form-id="zimbra"
                data-input-id="username"
                :list="integrationConfigDatalistId('zimbra', 'username')"
                autocomplete="section-zimbra username"
                @input="
                  trackInputValueForSuggestions(
                    'zimbra',
                    'username',
                    zimbraConfigForm.username,
                  )
                "
              />
              <datalist :id="integrationConfigDatalistId('zimbra', 'username')">
                <option
                  v-for="option in getInputSuggestions('zimbra', 'username')"
                  :key="`zimbra-username-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <label class="glpi-config-field">
              <span>Senha</span>
                <input
                  v-model="zimbraConfigForm.password"
                  type="password"
                  :placeholder="
                    zimbraStoredSecrets.password
                      ? '******** (mantida se vazio)'
                      : 'Senha da conta Zimbra'
                  "
                  autocomplete="section-zimbra current-password"
                />
              <small v-if="zimbraStoredSecrets.password" class="glpi-config-help">
                Senha já salva. Preencha apenas para substituir.
              </small>
            </label>

            <footer class="glpi-config-actions">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="
                  actionInProgress === 'zimbra-config' ||
                  configOverviewLoading === 'zimbra'
                "
                @click="closeZimbraConfigModal"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="
                  actionInProgress === 'zimbra-config' ||
                  configOverviewLoading === 'zimbra'
                "
              >
                {{
                  actionInProgress === "zimbra-config"
                    ? "Salvando..."
                    : "Salvar e testar conexão"
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>

      <div
        v-if="isOutlookConfigOpen"
        class="glpi-config-backdrop"
        role="presentation"
        @click.self="closeOutlookConfigModal"
      >
        <section
          class="glpi-config-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="outlook-config-title"
        >
          <header class="glpi-config-header">
            <h2 id="outlook-config-title">Configurar Microsoft Outlook</h2>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              title="Fechar configuração Outlook"
              :disabled="
                actionInProgress === 'outlook-config' ||
                configOverviewLoading === 'outlook'
              "
              @click="closeOutlookConfigModal"
            >
              Fechar
            </button>
          </header>

          <form
            :id="integrationConfigFormElementId('outlook')"
            class="glpi-config-form"
            data-form-id="outlook"
            @submit.prevent="saveOutlookConfiguration"
          >
            <p
              v-if="configOverviewLoading === 'outlook'"
              class="glpi-config-banner"
            >
              Carregando configuração atual...
            </p>
            <p v-else-if="hasOutlookStoredSecrets" class="glpi-config-banner">
              Configuração existente detectada. O Client Secret pode ficar vazio
              para manter o valor atual.
            </p>

            <label class="glpi-config-field">
              <span>Tenant ID</span>
              <input
                v-model="outlookConfigForm.tenantId"
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                :id="integrationConfigInputElementId('outlook', 'tenantId')"
                data-form-id="outlook"
                data-input-id="tenantId"
                :list="integrationConfigDatalistId('outlook', 'tenantId')"
                autocomplete="off"
                @input="
                  trackInputValueForSuggestions(
                    'outlook',
                    'tenantId',
                    outlookConfigForm.tenantId,
                  )
                "
              />
              <datalist :id="integrationConfigDatalistId('outlook', 'tenantId')">
                <option
                  v-for="option in getInputSuggestions('outlook', 'tenantId')"
                  :key="`outlook-tenantId-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <label class="glpi-config-field">
              <span>Client ID</span>
              <input
                v-model="outlookConfigForm.clientId"
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                :id="integrationConfigInputElementId('outlook', 'clientId')"
                data-form-id="outlook"
                data-input-id="clientId"
                :list="integrationConfigDatalistId('outlook', 'clientId')"
                autocomplete="off"
                @input="
                  trackInputValueForSuggestions(
                    'outlook',
                    'clientId',
                    outlookConfigForm.clientId,
                  )
                "
              />
              <datalist :id="integrationConfigDatalistId('outlook', 'clientId')">
                <option
                  v-for="option in getInputSuggestions('outlook', 'clientId')"
                  :key="`outlook-clientId-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <label class="glpi-config-field">
              <span>Client Secret</span>
              <input
                v-model="outlookConfigForm.clientSecret"
                type="password"
                :placeholder="
                  outlookStoredSecrets.clientSecret
                    ? '******** (mantido se vazio)'
                    : 'Secret do app registrado no Azure'
                "
                autocomplete="off"
              />
              <small
                v-if="outlookStoredSecrets.clientSecret"
                class="glpi-config-help"
              >
                Client Secret já salvo. Preencha apenas para substituir.
              </small>
            </label>

            <footer class="glpi-config-actions">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="
                  actionInProgress === 'outlook-config' ||
                  configOverviewLoading === 'outlook'
                "
                @click="closeOutlookConfigModal"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="
                  actionInProgress === 'outlook-config' ||
                  configOverviewLoading === 'outlook'
                "
              >
                {{
                  actionInProgress === "outlook-config"
                    ? "Salvando..."
                    : "Salvar e testar conexão"
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>

      <div
        v-if="isWhatsAppConfigOpen"
        class="glpi-config-backdrop"
        role="presentation"
        @click.self="closeWhatsAppConfigModal"
      >
        <section
          class="glpi-config-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-config-title"
        >
          <header class="glpi-config-header">
            <h2 id="whatsapp-config-title">Configurar WhatsApp Business</h2>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              title="Fechar configuração WhatsApp"
              :disabled="
                actionInProgress === 'whatsapp-config' ||
                actionInProgress === 'whatsapp-sync' ||
                configOverviewLoading === 'whatsapp'
              "
              @click="closeWhatsAppConfigModal"
            >
              Fechar
            </button>
          </header>

          <form
            :id="integrationConfigFormElementId('whatsapp')"
            class="glpi-config-form"
            data-form-id="whatsapp"
            @submit.prevent="saveWhatsAppConfiguration"
          >
            <p
              v-if="configOverviewLoading === 'whatsapp'"
              class="glpi-config-banner"
            >
              Carregando configuração atual...
            </p>
            <p v-else-if="hasWhatsAppStoredSecrets" class="glpi-config-banner">
              Token já configurado. Deixe em branco para manter o segredo atual.
            </p>
            <p class="glpi-config-banner">
              IMPORTANT: finalize com os valores reais da Meta (token + IDs) no
              ambiente final antes do go-live.
            </p>

            <section
              class="integration-whatsapp-health"
              aria-live="polite"
              aria-label="Diagnóstico da integração WhatsApp"
            >
              <header class="integration-whatsapp-health__header">
                <h3>Diagnóstico rápido</h3>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost"
                  :disabled="
                    isWhatsAppHealthLoading ||
                    actionInProgress === 'whatsapp-config' ||
                    actionInProgress === 'whatsapp-sync'
                  "
                  @click="refreshWhatsAppHealth()"
                >
                  {{
                    isWhatsAppHealthLoading
                      ? "Atualizando..."
                      : "Atualizar diagnóstico"
                  }}
                </button>
              </header>

              <p v-if="isWhatsAppHealthLoading" class="glpi-config-help">
                Consultando saúde da integração...
              </p>
              <template v-else-if="whatsappHealth">
                <p class="glpi-config-help">
                  Estado atual: <strong>{{ whatsappHealthStatusLabel }}</strong>
                </p>

                <ul
                  v-if="whatsappSetupChecklist.length"
                  class="integration-whatsapp-health__checklist"
                >
                  <li
                    v-for="field in whatsappSetupChecklist"
                    :key="field.key"
                    class="integration-whatsapp-health__check-item"
                  >
                    <div>
                      <strong>{{ field.label }}</strong>
                      <small v-if="field.note" class="glpi-config-help">
                        {{ field.note }}
                      </small>
                    </div>
                    <span
                      class="integration-whatsapp-health__status"
                      :class="{
                        'is-ready': field.present,
                        'is-missing': !field.present && field.required,
                        'is-optional-missing': !field.present && !field.required,
                      }"
                    >
                      {{
                        field.present
                          ? "OK"
                          : field.required
                            ? "Pendente"
                            : "Opcional"
                      }}
                    </span>
                  </li>
                </ul>

                <p
                  v-if="whatsappMissingRequiredFields.length"
                  class="integration-whatsapp-health__warning"
                >
                  Pendências obrigatórias: {{ whatsappMissingRequiredFields.join(", ") }}
                </p>

                <ul
                  v-if="whatsappHealthIssues.length"
                  class="integration-whatsapp-health__issues"
                >
                  <li v-for="issue in whatsappHealthIssues" :key="issue">
                    {{ issue }}
                  </li>
                </ul>

                <p v-if="whatsappNextStep" class="glpi-config-help">
                  Próximo passo: {{ whatsappNextStep }}
                </p>

                <div class="integration-whatsapp-health__actions">
                  <button
                    type="button"
                    class="btn btn-secondary"
                    :disabled="!canTriggerWhatsAppSync"
                    @click="triggerWhatsAppSyncNow"
                  >
                    {{
                      isWhatsAppSyncLoading ? "Sincronizando..." : "Sincronizar agora"
                    }}
                  </button>
                  <small v-if="whatsappSyncStatusLabel" class="glpi-config-help">
                    Status do sync: {{ whatsappSyncStatusLabel }}
                  </small>
                </div>

                <p v-if="whatsappSyncHint" class="glpi-config-help">
                  {{ whatsappSyncHint }}
                </p>
                <p v-if="whatsappSyncSummaryLabel" class="glpi-config-help">
                  {{ whatsappSyncSummaryLabel }}
                </p>
              </template>
            </section>

            <label class="glpi-config-field">
              <span>Access Token (Meta)</span>
              <input
                v-model="whatsappConfigForm.accessToken"
                type="password"
                :placeholder="
                  whatsappStoredSecrets.accessToken
                    ? '******** (mantido se vazio)'
                    : 'Token permanente da Meta Graph API'
                "
                autocomplete="off"
              />
              <small
                v-if="whatsappStoredSecrets.accessToken"
                class="glpi-config-help"
              >
                Access Token já salvo. Preencha apenas para substituir.
              </small>
            </label>

            <label class="glpi-config-field">
              <span>ID da Conta WhatsApp Business</span>
              <input
                v-model="whatsappConfigForm.businessAccountId"
                type="text"
                placeholder="123456789012345"
                :id="
                  integrationConfigInputElementId('whatsapp', 'businessAccountId')
                "
                data-form-id="whatsapp"
                data-input-id="businessAccountId"
                :list="
                  integrationConfigDatalistId('whatsapp', 'businessAccountId')
                "
                autocomplete="off"
                @input="
                  trackInputValueForSuggestions(
                    'whatsapp',
                    'businessAccountId',
                    whatsappConfigForm.businessAccountId,
                  )
                "
              />
              <datalist
                :id="integrationConfigDatalistId('whatsapp', 'businessAccountId')"
              >
                <option
                  v-for="option in getInputSuggestions('whatsapp', 'businessAccountId')"
                  :key="`whatsapp-businessAccountId-${option}`"
                  :value="option"
                />
              </datalist>
            </label>

            <div class="glpi-config-grid">
              <label class="glpi-config-field">
                <span>ID do Número (opcional)</span>
                <input
                  v-model="whatsappConfigForm.phoneNumberId"
                  type="text"
                  placeholder="109876543210987"
                  :id="integrationConfigInputElementId('whatsapp', 'phoneNumberId')"
                  data-form-id="whatsapp"
                  data-input-id="phoneNumberId"
                  :list="
                    integrationConfigDatalistId('whatsapp', 'phoneNumberId')
                  "
                  autocomplete="off"
                  @input="
                    trackInputValueForSuggestions(
                      'whatsapp',
                      'phoneNumberId',
                      whatsappConfigForm.phoneNumberId,
                    )
                  "
                />
                <small class="glpi-config-help">
                  Necessário para analytics detalhado de mensagens.
                </small>
                <datalist
                  :id="integrationConfigDatalistId('whatsapp', 'phoneNumberId')"
                >
                  <option
                    v-for="option in getInputSuggestions('whatsapp', 'phoneNumberId')"
                    :key="`whatsapp-phoneNumberId-${option}`"
                    :value="option"
                  />
                </datalist>
              </label>

              <label class="glpi-config-field">
                <span>Versão da API</span>
                <input
                  v-model="whatsappConfigForm.apiVersion"
                  type="text"
                  placeholder="v18.0"
                  :id="integrationConfigInputElementId('whatsapp', 'apiVersion')"
                  data-form-id="whatsapp"
                  data-input-id="apiVersion"
                  :list="integrationConfigDatalistId('whatsapp', 'apiVersion')"
                  autocomplete="off"
                  @input="
                    trackInputValueForSuggestions(
                      'whatsapp',
                      'apiVersion',
                      whatsappConfigForm.apiVersion,
                    )
                  "
                />
                <datalist
                  :id="integrationConfigDatalistId('whatsapp', 'apiVersion')"
                >
                  <option
                    v-for="option in getInputSuggestions('whatsapp', 'apiVersion')"
                    :key="`whatsapp-apiVersion-${option}`"
                    :value="option"
                  />
                </datalist>
              </label>
            </div>

            <footer class="glpi-config-actions">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="
                  actionInProgress === 'whatsapp-config' ||
                  actionInProgress === 'whatsapp-sync' ||
                  configOverviewLoading === 'whatsapp'
                "
                @click="closeWhatsAppConfigModal"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="
                  actionInProgress === 'whatsapp-config' ||
                  actionInProgress === 'whatsapp-sync' ||
                  configOverviewLoading === 'whatsapp'
                "
              >
                {{
                  actionInProgress === "whatsapp-config"
                    ? "Salvando..."
                    : "Salvar e testar conexão"
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
  </main>
</template>

<style lang="scss">
@use "../styles/components/integrations/integrations-page";
</style>
