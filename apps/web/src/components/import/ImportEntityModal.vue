<script setup lang="ts">
import { computed, ref } from "vue";
import styles from "./ImportEntityModal.module.scss";
import AlertService from "../../services/AlertService";
import SmartAutocompleteService from "../../services/SmartAutocompleteService";
import ApiClientService, {
  type ImportFieldSuggestionsItem,
  type ImportSourceProfile,
  type ImportTemplateRecord,
} from "../../services/ApiClientService";
import {
  ApiImportSubmitGateway,
  BrowserImportSourceFileTextReader,
  BrazilApiCepLookupGateway,
  ImportColumnMappingResolver,
  ImportDocumentParserRegistry,
  ImportApprovalQueue,
  ImportBlueprintRegistry,
  ImportDraftMapperRegistry,
  ImportExecutionService,
  ImportFieldCatalog,
  ImportFieldRules,
  ImportInputSuggestionService,
  ImportPersonalizationService,
  ImportSourceIngestionService,
  type ClientImportDraft,
  type ClientImportPayload,
  type ImportBlueprint,
  type ImportApprovalItem,
  type ImportColumnMapping,
  type ImportEntityKind,
  type ImportFieldDefinition,
  type ImportIngestionRejectedRow,
  type ProjectImportDraft,
  type ProjectImportPayload,
  type UserImportDraft,
  type UserImportPayload,
  type UserRoleKey,
} from "../../utils/import";

interface Props {
  kind: ImportEntityKind;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "confirm",
    payload: Readonly<{ kind: ImportEntityKind; imported: number }>,
  ): void;
}>();

type AnyDraft = ClientImportDraft | ProjectImportDraft | UserImportDraft;
type AnyPayload = ClientImportPayload | ProjectImportPayload | UserImportPayload;
type GenericBlueprint = ImportBlueprint<
  Record<string, unknown>,
  Record<string, unknown>
>;
type TemplateDiffEntry = Readonly<{
  key: string;
  from?: string;
  to?: string;
}>;
type TemplateDiffGroup = Readonly<{
  added: readonly TemplateDiffEntry[];
  removed: readonly TemplateDiffEntry[];
  changed: readonly TemplateDiffEntry[];
}>;
type TemplateDiffPreview = Readonly<{
  targetVersion: number;
  summary: string;
  mapping: TemplateDiffGroup;
  defaults: TemplateDiffGroup;
}>;

const blueprintRegistry = new ImportBlueprintRegistry(new BrazilApiCepLookupGateway());
const queue = new ImportApprovalQueue<AnyPayload>();
const executionService = new ImportExecutionService(new ApiImportSubmitGateway());
const sourceIngestionService = new ImportSourceIngestionService({
  fileTextReader: new BrowserImportSourceFileTextReader(),
  parserRegistry: new ImportDocumentParserRegistry(),
  draftMapperRegistry: new ImportDraftMapperRegistry(),
});
const fieldCatalog = new ImportFieldCatalog();
const columnMappingResolver = new ImportColumnMappingResolver();
const personalizationService = new ImportPersonalizationService();
const templateNameAutocomplete = new SmartAutocompleteService(
  `import-template-${props.kind}`,
);

const blueprint = computed<GenericBlueprint>(
  () => blueprintRegistry.resolve(props.kind) as GenericBlueprint,
);
const draft = ref<AnyDraft>(blueprint.value.createDraft() as AnyDraft);
const fieldErrors = ref<Record<string, string>>({});
const validationHint = ref<string>("");
const isCollapsed = ref(false);
const isAdding = ref(false);
const isSubmitting = ref(false);
const isCepChecking = ref(false);
const cepLookupHint = ref<string>("");
const previewRows = ref<ImportApprovalItem<AnyPayload>[]>([]);
const sourceFileInput = ref<HTMLInputElement | null>(null);
const sourceFile = ref<File | null>(null);
const isSourceAnalyzing = ref(false);
const isSourceImporting = ref(false);
const sourceImportHint = ref("");
const sourceWarnings = ref<string[]>([]);
const sourceRejectedRows = ref<ImportIngestionRejectedRow[]>([]);
const sourceColumns = ref<string[]>([]);
const sourceDetectedFormat = ref("");
const sourceDetectedRows = ref(0);
const sourceColumnMapping = ref<Record<string, string>>({});
const sourceDefaultValues = ref<Record<string, string>>({});
const useSourceDefaultAutofill = ref(true);
const savedTemplates = ref<ImportTemplateRecord[]>([]);
const selectedTemplateId = ref("");
const selectedTemplateVersion = ref<number | null>(null);
const templateNameInput = ref("");
const templateNameSuggestions = ref<string[]>([]);
const sourceProfiles = ref<ImportSourceProfile[]>([]);
const selectedProfileKey = ref("");
const templateDiffPreview = ref<TemplateDiffPreview | null>(null);
const fieldSuggestions = ref<Record<string, readonly { value: string; score: number }[]>>(
  {},
);

const roleOptions: readonly UserRoleKey[] = [
  "admin",
  "manager",
  "member",
  "viewer",
];
const projectStatusOptions = [
  "planned",
  "active",
  "blocked",
  "done",
  "archived",
] as const;
const clientTypeOptions = [
  { value: "pessoa", label: "Pessoa" },
  { value: "empresa", label: "Empresa" },
] as const;

const inputIconByField: Readonly<Record<string, string | undefined>> = {
  name: styles.iconPerson,
  type: styles.iconBriefcase,
  company: styles.iconBuilding,
  email: styles.iconEnvelope,
  cnpj: styles.iconHash,
  cep: styles.iconGeo,
  phone: styles.iconPhone,
  cellPhone: styles.iconPhone,
  whatsappNumber: styles.iconChat,
  code: styles.iconHash,
  ownerEmail: styles.iconBriefcase,
  tags: styles.iconHash,
  firstName: styles.iconPerson,
  lastName: styles.iconPerson,
  department: styles.iconBriefcase,
};

const approvedRows = computed(() =>
  previewRows.value.filter((row) => row.approved && row.status !== "success"),
);
const hasApprovedRows = computed(() => approvedRows.value.length > 0);
const hasSourceColumns = computed(() => sourceColumns.value.length > 0);
const mappedColumnsCount = computed(
  () => Object.values(sourceColumnMapping.value).filter(Boolean).length,
);
const sourceFields = computed<readonly ImportFieldDefinition[]>(() =>
  fieldCatalog.get(props.kind),
);
const hasSourceDefaultValues = computed(() =>
  Object.values(sourceDefaultValues.value).some((value) => Boolean(value.trim())),
);
const selectedTemplate = computed(() =>
  savedTemplates.value.find((template) => template.id === selectedTemplateId.value) ??
  null,
);
const selectedTemplateVersions = computed(
  () => selectedTemplate.value?.versions ?? [],
);
const availableProfiles = computed(() =>
  sourceProfiles.value.filter((profile) => profile.kind === props.kind),
);
const visibleRejectedRows = computed(() => sourceRejectedRows.value.slice(0, 8));
const hiddenRejectedRowsCount = computed(
  () => sourceRejectedRows.value.length - visibleRejectedRows.value.length,
);

const isCompanyDraft = computed(
  () => props.kind === "clients" && (draft.value as ClientImportDraft).type === "empresa",
);

const canAddDraft = computed(() => {
  const errors = blueprint.value.validateDraftSync(draft.value as any) as Record<
    string,
    string
  >;
  return (
    !isAdding.value &&
    !isSubmitting.value &&
    !isCepChecking.value &&
    Object.keys(errors).length === 0
  );
});

const typeLabel = computed(() => {
  if (props.kind === "clients") return "cliente";
  if (props.kind === "projects") return "projeto";
  return "usuário";
});

const normalizeDraft = (): void => {
  if (props.kind === "clients") {
    const current = draft.value as ClientImportDraft;
    current.name = ImportFieldRules.normalizeText(current.name);
    current.company = ImportFieldRules.normalizeText(current.company);
    current.cnpj = ImportFieldRules.normalizeCnpj(current.cnpj);
    current.cep = ImportFieldRules.normalizeCep(current.cep);
    current.phone = ImportFieldRules.normalizePhone(current.phone);
    current.cellPhone = ImportFieldRules.normalizePhone(current.cellPhone);
    current.whatsappNumber = ImportFieldRules.normalizePhone(current.whatsappNumber);
    current.notes = ImportFieldRules.normalizeText(current.notes);
    return;
  }

  if (props.kind === "projects") {
    const current = draft.value as ProjectImportDraft;
    current.name = ImportFieldRules.normalizeText(current.name);
    current.code = current.code.trim().toUpperCase();
    current.description = ImportFieldRules.normalizeText(current.description);
    current.notes = ImportFieldRules.normalizeText(current.notes);
    current.ownerEmail = current.ownerEmail.trim();
    current.tags = current.tags.trim();
    return;
  }

  const current = draft.value as UserImportDraft;
  current.email = current.email.trim().toLowerCase();
  current.firstName = ImportFieldRules.normalizeText(current.firstName);
  current.lastName = ImportFieldRules.normalizeText(current.lastName);
  current.phone = ImportFieldRules.normalizePhone(current.phone);
  current.department = ImportFieldRules.normalizeText(current.department);
  current.notes = ImportFieldRules.normalizeText(current.notes);
};

const refreshSyncErrors = (): void => {
  const errors = blueprint.value.validateDraftSync(draft.value as any) as Record<
    string,
    string
  >;
  fieldErrors.value = { ...errors };
};

const resetDraft = (): void => {
  draft.value = blueprint.value.createDraft() as AnyDraft;
  fieldErrors.value = {};
  validationHint.value = "";
  cepLookupHint.value = "";
};

const handleClientTypeChange = (): void => {
  if (props.kind !== "clients") return;
  const current = draft.value as ClientImportDraft;
  if (current.type === "pessoa") {
    current.cnpj = "";
    current.cep = "";
    cepLookupHint.value = "";
  }
  refreshSyncErrors();
};

const handleCepChange = async (): Promise<void> => {
  if (props.kind !== "clients" || !isCompanyDraft.value) return;

  const current = draft.value as ClientImportDraft;
  current.cep = ImportFieldRules.normalizeCep(current.cep);
  if (!current.cep) {
    cepLookupHint.value = "";
    refreshSyncErrors();
    return;
  }
  if (!ImportFieldRules.isValidCep(current.cep)) {
    refreshSyncErrors();
    return;
  }

  isCepChecking.value = true;
  try {
    const clientBlueprint = blueprintRegistry.getClientBlueprint();
    const result = await clientBlueprint.lookupCep(current.cep);
    if (!result?.ok) {
      fieldErrors.value = {
        ...fieldErrors.value,
        cep: result?.message || "CEP inválido.",
      };
      cepLookupHint.value = result?.message || "";
      return;
    }

    fieldErrors.value = {
      ...fieldErrors.value,
      cep: "",
    };
    if (result.city || result.state) {
      cepLookupHint.value = `CEP validado: ${result.city ?? ""}${result.city && result.state ? "/" : ""}${result.state ?? ""}`;
    } else {
      cepLookupHint.value = "CEP validado pela BrasilAPI.";
    }
  } catch (error) {
    fieldErrors.value = {
      ...fieldErrors.value,
      cep: "Falha ao validar CEP na BrasilAPI.",
    };
    cepLookupHint.value = "Falha ao validar CEP na BrasilAPI.";
  } finally {
    isCepChecking.value = false;
  }
};

const addToPreview = async (): Promise<void> => {
  normalizeDraft();
  refreshSyncErrors();
  if (Object.keys(fieldErrors.value).some((key) => fieldErrors.value[key])) {
    validationHint.value = "Revise os campos inválidos antes de adicionar à prévia.";
    return;
  }

  isAdding.value = true;
  validationHint.value = "";
  try {
    const validation = await blueprint.value.validateDraft(draft.value as any);
    fieldErrors.value = {
      ...(validation.errors as Record<string, string>),
    };
    if (!validation.valid) {
      validationHint.value =
        "Revise os campos obrigatórios e padrões antes de continuar.";
      return;
    }

    const payload = blueprint.value.toPayload(draft.value as any) as AnyPayload;
    const summary = blueprint.value.summarize(payload as any);
    previewRows.value = queue.add(previewRows.value, payload, summary);
    resetDraft();
  } finally {
    isAdding.value = false;
  }
};

const removePreviewRow = (id: string): void => {
  previewRows.value = queue.remove(previewRows.value, id);
};

const toggleApproval = (id: string): void => {
  previewRows.value = queue.toggleApproved(previewRows.value, id);
};

const setAllApproved = (approved: boolean): void => {
  previewRows.value = queue.setAllApproved(previewRows.value, approved);
};

const statusLabel = (status: ImportApprovalItem<AnyPayload>["status"]): string => {
  if (status === "success") return "Importado";
  if (status === "failed") return "Falhou";
  return "Pendente";
};

const formatRejectedErrors = (row: ImportIngestionRejectedRow): string => {
  const errors = Object.values(row.fieldErrors).filter(Boolean);
  return errors.join(" ");
};

const diffGroupHasChanges = (group: TemplateDiffGroup): boolean => {
  return group.added.length > 0 || group.removed.length > 0 || group.changed.length > 0;
};

const formatDiffValue = (value: string | undefined): string => {
  const normalized = (value ?? "").trim();
  return normalized || "(vazio)";
};

const buildEmptySourceMapping = (): Record<string, string> => {
  return sourceFields.value.reduce<Record<string, string>>((mapping, field) => {
    mapping[field.key] = "";
    return mapping;
  }, {});
};

const buildEmptySourceDefaults = (): Record<string, string> => {
  return sourceFields.value.reduce<Record<string, string>>((defaults, field) => {
    defaults[field.key] = "";
    return defaults;
  }, {});
};

const applySuggestedSourceMapping = (): void => {
  sourceColumnMapping.value = columnMappingResolver.suggest(
    sourceColumns.value,
    sourceFields.value,
  ) as Record<string, string>;
};

const buildSelectedMapping = (): Record<string, string> => {
  return Object.entries(sourceColumnMapping.value).reduce<Record<string, string>>(
    (mapping, [targetKey, sourceKey]) => {
      if (targetKey && sourceKey) {
        mapping[targetKey] = sourceKey;
      }
      return mapping;
    },
    {},
  );
};

const buildSelectedDefaultValues = (): Record<string, string> => {
  return Object.entries(sourceDefaultValues.value).reduce<Record<string, string>>(
    (defaults, [targetField, fallback]) => {
      const normalized = fallback.trim();
      if (!targetField || !normalized) return defaults;
      defaults[targetField] = normalized;
      return defaults;
    },
    {},
  );
};

const resolveTemplateSnapshot = (
  template: ImportTemplateRecord,
  versionNumber: number | null,
) => {
  const targetVersion = versionNumber ?? template.latestVersion;
  return (
    template.versions.find((snapshot) => snapshot.version === targetVersion) ??
    template.versions.find((snapshot) => snapshot.version === template.latestVersion) ?? {
      version: template.latestVersion,
      createdAt: template.updatedAt,
      createdByEmail: template.updatedByEmail,
      columnMapping: template.columnMapping,
      defaultValues: template.defaultValues,
    }
  );
};

const applyTemplateSnapshot = (
  template: ImportTemplateRecord,
  snapshot: Readonly<{
    version: number;
    profileKey?: string;
    columnMapping: Readonly<Record<string, string>>;
    defaultValues: Readonly<Record<string, string>>;
  }>,
): void => {
  selectedTemplateId.value = template.id;
  selectedTemplateVersion.value = snapshot.version;
  selectedProfileKey.value = snapshot.profileKey ?? template.profileKey ?? "";
  templateNameInput.value = template.name;
  templateNameAutocomplete.commit(template.name);
  refreshTemplateNameSuggestions();

  const allowedColumns = new Set(sourceColumns.value);
  const nextMapping = buildEmptySourceMapping();
  Object.entries(snapshot.columnMapping).forEach(([targetField, sourceColumn]) => {
    if (!Object.prototype.hasOwnProperty.call(nextMapping, targetField)) return;
    if (!sourceColumns.value.length || allowedColumns.has(sourceColumn)) {
      nextMapping[targetField] = sourceColumn;
    }
  });
  sourceColumnMapping.value = nextMapping;
  sourceDefaultValues.value = {
    ...buildEmptySourceDefaults(),
    ...snapshot.defaultValues,
  };
  useSourceDefaultAutofill.value = hasSourceDefaultValues.value;
};

const refreshSavedTemplates = async (): Promise<void> => {
  try {
    const response = await ApiClientService.import.listTemplates(props.kind);
    savedTemplates.value = response.items ?? [];
  } catch {
    savedTemplates.value = [];
  } finally {
    refreshTemplateNameSuggestions();
  }
};

const refreshSourceProfiles = async (): Promise<void> => {
  try {
    const response = await ApiClientService.import.listProfiles(props.kind);
    sourceProfiles.value = response.items ?? [];
  } catch {
    sourceProfiles.value = [];
  }
};

const refreshTemplateNameSuggestions = (): void => {
  const query = templateNameInput.value.trim().toLowerCase();
  const fromHistory = templateNameAutocomplete.suggest(templateNameInput.value);
  const fromTemplates = savedTemplates.value
    .map((template) => template.name)
    .filter((name) => !query || name.toLowerCase().includes(query))
    .slice(0, 5);
  const merged = [...fromTemplates, ...fromHistory].filter(
    (name, index, names) => names.indexOf(name) === index,
  );
  templateNameSuggestions.value = merged.slice(0, 5);
};

const applyProfile = (profile: ImportSourceProfile): void => {
  selectedTemplateId.value = "";
  selectedTemplateVersion.value = null;
  selectedProfileKey.value = profile.key;
  templateNameInput.value = profile.label;
  templateDiffPreview.value = null;
  templateNameAutocomplete.commit(profile.label);
  refreshTemplateNameSuggestions();

  const allowedColumns = new Set(sourceColumns.value);
  const nextMapping = buildEmptySourceMapping();
  Object.entries(profile.columnMapping).forEach(([targetField, sourceColumn]) => {
    if (!Object.prototype.hasOwnProperty.call(nextMapping, targetField)) return;
    if (!sourceColumns.value.length || allowedColumns.has(sourceColumn)) {
      nextMapping[targetField] = sourceColumn;
    }
  });
  sourceColumnMapping.value = nextMapping;
  sourceDefaultValues.value = {
    ...buildEmptySourceDefaults(),
    ...profile.defaultValues,
  };
  useSourceDefaultAutofill.value = hasSourceDefaultValues.value;
  sourceImportHint.value = `Perfil aplicado: ${profile.label}.`;
};

const onSelectedTemplateChange = async (): Promise<void> => {
  templateDiffPreview.value = null;
  const templateId = selectedTemplateId.value;
  if (!templateId) {
    selectedTemplateVersion.value = null;
    return;
  }

  const localTemplate =
    savedTemplates.value.find((template) => template.id === templateId) ?? null;
  if (localTemplate) {
    selectedTemplateVersion.value = localTemplate.latestVersion;
    templateNameInput.value = localTemplate.name;
    refreshTemplateNameSuggestions();
  }

  try {
    const remoteTemplate = await ApiClientService.import.getTemplate(templateId);
    savedTemplates.value = savedTemplates.value.some(
      (template) => template.id === remoteTemplate.id,
    )
      ? savedTemplates.value.map((template) =>
          template.id === remoteTemplate.id ? remoteTemplate : template,
        )
      : [...savedTemplates.value, remoteTemplate];
    selectedTemplateVersion.value = remoteTemplate.latestVersion;
    templateNameInput.value = remoteTemplate.name;
    refreshTemplateNameSuggestions();
  } catch {
    void 0;
  }
};

const applySelectedTemplate = async (): Promise<void> => {
  const template = selectedTemplate.value;
  if (!template) return;

  const targetVersion = selectedTemplateVersion.value ?? template.latestVersion;
  try {
    const preview = await ApiClientService.import.previewTemplateApply(template.id, {
      targetVersion,
      currentColumnMapping: buildSelectedMapping(),
      currentDefaultValues: buildSelectedDefaultValues(),
    });

    templateDiffPreview.value = {
      targetVersion: preview.targetVersion,
      summary:
        `Mapeamentos alterados: ${preview.diff.summary.mappingDeltaCount}. ` +
        `Defaults alterados: ${preview.diff.summary.defaultsDeltaCount}.`,
      mapping: preview.diff.mapping,
      defaults: preview.diff.defaults,
    };

    const confirmed = await AlertService.confirm(
      "Aplicar template?",
      `Versão ${preview.targetVersion}. ` +
        `Mapeamentos alterados: ${preview.diff.summary.mappingDeltaCount}. ` +
        `Defaults alterados: ${preview.diff.summary.defaultsDeltaCount}.`,
    );
    if (!confirmed) return;

    applyTemplateSnapshot(template, {
      version: preview.targetVersion,
      profileKey: preview.targetProfileKey,
      columnMapping: preview.targetColumnMapping,
      defaultValues: preview.targetDefaultValues,
    });

    await ApiClientService.import.markTemplateUsed(template.id).catch(() => void 0);
    personalizationService.setLastUsedServerTemplateId(props.kind, template.id);
    await refreshSavedTemplates();
    sourceImportHint.value = `Template aplicado: ${template.name} (v${preview.targetVersion}).`;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a prévia de aplicação do template.";
    await AlertService.error("Falha ao aplicar template", message);
  }
};

const loadLastTemplate = async (): Promise<void> => {
  const lastUsedTemplateId = personalizationService.getLastUsedServerTemplateId(
    props.kind,
  );
  if (!lastUsedTemplateId) return;
  if (!savedTemplates.value.some((template) => template.id === lastUsedTemplateId)) {
    return;
  }
  selectedTemplateId.value = lastUsedTemplateId;
  await onSelectedTemplateChange();
};

const saveCurrentTemplate = async (): Promise<void> => {
  const name = templateNameInput.value.trim();
  if (!name) {
    await AlertService.error(
      "Nome obrigatório",
      "Informe um nome para salvar o template de importação.",
    );
    return;
  }

  const payload = {
    kind: props.kind,
    name,
    profileKey: selectedProfileKey.value || undefined,
    columnMapping: buildSelectedMapping(),
    defaultValues: buildSelectedDefaultValues(),
    changeNote: "Atualizado via modal de importação",
  };

  if (Object.keys(payload.columnMapping).length === 0) {
    await AlertService.error(
      "Template inválido",
      "Defina ao menos um mapeamento de coluna antes de salvar.",
    );
    return;
  }

  try {
    const existingByName = savedTemplates.value.find(
      (template) => template.name.trim().toLowerCase() === name.toLowerCase(),
    );
    const persisted = existingByName
      ? await ApiClientService.import.updateTemplate(existingByName.id, payload)
      : await ApiClientService.import.createTemplate(payload);

    templateNameAutocomplete.commit(name);
    personalizationService.setLastUsedServerTemplateId(props.kind, persisted.id);
    await refreshSavedTemplates();
    selectedTemplateId.value = persisted.id;
    await onSelectedTemplateChange();
    sourceImportHint.value = `Template salvo: ${name}.`;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível salvar o template.";
    await AlertService.error("Falha ao salvar template", message);
  }
};

const removeSelectedTemplate = async (): Promise<void> => {
  const template = selectedTemplate.value;
  if (!template) return;

  const confirmed = await AlertService.confirm(
    "Remover template?",
    `Template "${template.name}" será removido para toda a equipe.`,
  );
  if (!confirmed) return;

  try {
    await ApiClientService.import.deleteTemplate(template.id);
    personalizationService.setLastUsedServerTemplateId(props.kind, null);
    selectedTemplateId.value = "";
    selectedTemplateVersion.value = null;
    templateDiffPreview.value = null;
    await refreshSavedTemplates();
    sourceImportHint.value = `Template removido: ${template.name}.`;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível remover o template.";
    await AlertService.error("Falha ao remover template", message);
  }
};

const getAutofillOptions = (
  field: ImportFieldDefinition,
): Array<{ value: string; label: string }> => {
  if (props.kind === "clients" && field.key === "type") {
    return clientTypeOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }
  if (props.kind === "clients" && field.key === "preferredContact") {
    return [
      { value: "email", label: "E-mail" },
      { value: "phone", label: "Telefone" },
      { value: "cellphone", label: "Celular" },
      { value: "whatsapp", label: "WhatsApp" },
    ];
  }
  if (props.kind === "projects" && field.key === "status") {
    return projectStatusOptions.map((status) => ({ value: status, label: status }));
  }
  if (props.kind === "users" && field.key === "roleKey") {
    return roleOptions.map((role) => ({ value: role, label: role }));
  }
  return [];
};

const datalistIdForField = (field: string): string =>
  `import-field-suggestions-${props.kind}-${field}`;

const inputIconClass = (field: string): string =>
  inputIconByField[field] ?? styles.iconFolder ?? "";

const resolveInputSuggestions = (field: string, query: string): string[] => {
  const suggestions = fieldSuggestions.value[field] ?? [];
  return ImportInputSuggestionService.rankValues(suggestions, query, 5);
};

const refreshFieldSuggestions = async (): Promise<void> => {
  try {
    const response = await ApiClientService.import.listFieldSuggestions(props.kind, {
      limit: 5,
    });
    fieldSuggestions.value = ImportInputSuggestionService.toFieldMap(
      (response.items ?? []) as ImportFieldSuggestionsItem[],
    ) as Record<string, readonly { value: string; score: number }[]>;
  } catch {
    fieldSuggestions.value = {};
  }
};

const onTemplateNameInput = (): void => {
  refreshTemplateNameSuggestions();
  const typedName = templateNameInput.value.trim().toLowerCase();
  if (!typedName) {
    selectedTemplateId.value = "";
    selectedTemplateVersion.value = null;
    templateDiffPreview.value = null;
    return;
  }
  const matchedTemplate = savedTemplates.value.find(
    (template) => template.name.toLowerCase() === typedName,
  );
  selectedTemplateId.value = matchedTemplate?.id ?? "";
  selectedTemplateVersion.value = matchedTemplate?.latestVersion ?? null;
  templateDiffPreview.value = null;
};

const onTemplateVersionChange = (): void => {
  templateDiffPreview.value = null;
};

const clearSourceDefaultValues = (): void => {
  sourceDefaultValues.value = buildEmptySourceDefaults();
};

const clearSourceFeedback = (): void => {
  sourceImportHint.value = "";
  sourceWarnings.value = [];
  sourceRejectedRows.value = [];
};

const clearSourceFileInputValue = (): void => {
  if (!sourceFileInput.value) return;
  sourceFileInput.value.value = "";
};

const resetSourceAnalysis = (): void => {
  sourceColumns.value = [];
  sourceDetectedFormat.value = "";
  sourceDetectedRows.value = 0;
  sourceColumnMapping.value = buildEmptySourceMapping();
  sourceDefaultValues.value = buildEmptySourceDefaults();
};

const prepareSourceAnalysis = async (): Promise<void> => {
  if (!sourceFile.value) return;

  isSourceAnalyzing.value = true;
  clearSourceFeedback();
  try {
    const analysis = await sourceIngestionService.analyze(sourceFile.value);
    sourceColumns.value = [...analysis.columns];
    sourceDetectedFormat.value = analysis.format.toUpperCase();
    sourceDetectedRows.value = analysis.totalRows;
    sourceWarnings.value = [...analysis.warnings];
    applySuggestedSourceMapping();
    if (selectedTemplateId.value) {
      const template = savedTemplates.value.find(
        (entry) => entry.id === selectedTemplateId.value,
      );
      if (template) {
        const snapshot = resolveTemplateSnapshot(
          template,
          selectedTemplateVersion.value,
        );
        applyTemplateSnapshot(template, snapshot);
      }
    }

    sourceImportHint.value =
      `${analysis.format.toUpperCase()}: ${analysis.totalRows} registro(s)` +
      ` e ${analysis.columns.length} coluna(s) detectada(s).`;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao analisar arquivo de origem.";
    sourceImportHint.value = message;
    validationHint.value = message;
    await AlertService.error("Falha na análise do arquivo", message);
  } finally {
    isSourceAnalyzing.value = false;
  }
};

const onSourceFileChange = async (event: Event): Promise<void> => {
  const nextFile = (event.target as HTMLInputElement)?.files?.[0] ?? null;
  sourceFile.value = nextFile;
  resetSourceAnalysis();
  clearSourceFeedback();
  if (nextFile) {
    sourceImportHint.value = `Arquivo selecionado: ${nextFile.name}. Lendo estrutura...`;
    await prepareSourceAnalysis();
  }
};

const initializeSourcePersonalization = async (): Promise<void> => {
  resetSourceAnalysis();
  await Promise.all([
    refreshSavedTemplates(),
    refreshSourceProfiles(),
    refreshFieldSuggestions(),
  ]);
  await loadLastTemplate();
  refreshTemplateNameSuggestions();
};

void initializeSourcePersonalization();

const ingestFromSourceFile = async (): Promise<void> => {
  if (!sourceFile.value || isSourceImporting.value || isSourceAnalyzing.value) return;

  if (!hasSourceColumns.value) {
    await prepareSourceAnalysis();
    if (!hasSourceColumns.value) return;
  }

  isSourceImporting.value = true;
  validationHint.value = "";
  clearSourceFeedback();

  try {
    const selectedMapping = buildSelectedMapping();
    const selectedDefaultValues = buildSelectedDefaultValues();

    const result = await sourceIngestionService.ingest(
      props.kind,
      sourceFile.value,
      blueprint.value as any,
      {
        columnMapping: selectedMapping as ImportColumnMapping,
        defaultValues: useSourceDefaultAutofill.value
          ? selectedDefaultValues
          : undefined,
      },
    );

    let nextRows = previewRows.value;
    result.accepted.forEach((item) => {
      nextRows = queue.add(nextRows, item.payload as AnyPayload, item.summary);
    });
    previewRows.value = nextRows;

    sourceWarnings.value = [...result.warnings];
    sourceRejectedRows.value = [...result.rejected];

    sourceImportHint.value =
      `${result.format.toUpperCase()}: ${result.accepted.length} válido(s)` +
      ` de ${result.totalRows} registro(s) lido(s).`;

    if (result.accepted.length === 0) {
      validationHint.value =
        "Nenhum registro válido foi adicionado. Revise o arquivo e as colunas esperadas.";
      await AlertService.error(
        "Importação sem itens válidos",
        "Nenhum registro passou na validação. Verifique os erros listados no modal.",
      );
      return;
    }

    if (result.rejected.length > 0) {
      validationHint.value =
        "Importação parcial: revise os itens rejeitados antes de continuar.";
      await AlertService.error(
        "Importação parcial",
        `${result.accepted.length} item(ns) adicionado(s) e ${result.rejected.length} com erro.`,
      );
      return;
    }

    await AlertService.success(
      "Arquivo processado",
      `${result.accepted.length} item(ns) adicionado(s) à prévia para aprovação.`,
    );
    clearSourceFileInputValue();
    sourceFile.value = null;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao ler o arquivo informado.";
    sourceImportHint.value = message;
    validationHint.value = message;
    await AlertService.error("Falha na leitura do arquivo", message);
  } finally {
    isSourceImporting.value = false;
  }
};

const submitApproved = async (): Promise<void> => {
  if (!hasApprovedRows.value) return;
  isSubmitting.value = true;
  validationHint.value = "";

  try {
    const payloads = approvedRows.value.map((row) => row.payload);
    const result = await executionService.submit(props.kind, payloads as any);
    const approvedIds = approvedRows.value.map((row) => row.id);

    previewRows.value = previewRows.value.map((row) => {
      const index = approvedIds.indexOf(row.id);
      if (index === -1) return row;
      const outcome = result.items[index];
      if (!outcome?.ok) {
        return {
          ...row,
          status: "failed",
          error: outcome?.error || "Falha no envio",
        };
      }
      return {
        ...row,
        status: "success",
        error: undefined,
      };
    });

    if (result.failureCount === 0) {
      await AlertService.success(
        "Importação concluída",
        `${result.successCount} ${typeLabel.value}(s) importado(s) com sucesso.`,
      );
      emit("confirm", { kind: props.kind, imported: result.successCount });
      return;
    }

    await AlertService.error(
      "Importação parcial",
      `${result.successCount} item(ns) importado(s) e ${result.failureCount} com falha.`,
    );
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <section :class="styles.importEntityModal">
    <header :class="styles.modalHeader">
      <div>
        <h3 :class="styles.modalTitle">Formulário de {{ typeLabel }}</h3>
        <p :class="styles.modalSubtitle">
          Preencha os campos e adicione os registros para revisão antes do envio final.
        </p>
      </div>
      <button
        type="button"
        class="btn btn-xs btn-ghost"
        :title="isCollapsed ? 'Expandir formulário' : 'Recolher formulário'"
        @click="isCollapsed = !isCollapsed"
      >
        {{ isCollapsed ? "Expandir formulário" : "Recolher formulário" }}
      </button>
    </header>

    <section :class="styles.sourceSection">
      <header :class="styles.sourceHeader">
        <h4 :class="styles.sourceTitle">Importar de arquivo de origem</h4>
        <p :class="styles.sourceSubtitle">
          Envie JSON, CSV, XML ou MD para preencher automaticamente os campos.
          PDF funciona em modo assistido (chave:valor).
        </p>
      </header>

      <div :class="styles.sourceControls">
        <label :class="styles.fileField">
          <span>Arquivo</span>
          <input
            ref="sourceFileInput"
            type="file"
            accept=".json,.csv,.xml,.md,.pdf,application/json,text/csv,application/xml,text/xml,text/markdown,text/x-markdown,application/pdf"
            @change="onSourceFileChange"
          />
        </label>
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="!sourceFile || isSourceAnalyzing || isSourceImporting"
          :aria-disabled="!sourceFile || isSourceAnalyzing || isSourceImporting"
          @click="prepareSourceAnalysis"
        >
          {{ isSourceAnalyzing ? "Lendo..." : "Ler colunas" }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="!sourceFile || isSourceImporting || isSourceAnalyzing"
          :aria-disabled="!sourceFile || isSourceImporting || isSourceAnalyzing"
          @click="ingestFromSourceFile"
        >
          {{ isSourceImporting ? "Processando..." : "Processar arquivo" }}
        </button>
      </div>

      <section v-if="hasSourceColumns" :class="styles.mappingSection">
        <header :class="styles.mappingHeader">
          <h5 :class="styles.mappingTitle">Mapeamento de colunas</h5>
          <p :class="styles.mappingMeta">
            {{ sourceDetectedFormat || "Arquivo" }} • {{ sourceDetectedRows }}
            linha(s) • {{ sourceColumns.length }} coluna(s) •
            {{ mappedColumnsCount }} mapeada(s)
          </p>
        </header>
        <div :class="styles.templateSection">
          <label :class="styles.templateField">
            <span>Nome do template</span>
            <input
              v-model="templateNameInput"
              type="text"
              :list="`import-template-suggestions-${props.kind}`"
              placeholder="Ex.: ERP ACME (Clientes)"
              autocomplete="off"
              @input="onTemplateNameInput"
            />
            <datalist :id="`import-template-suggestions-${props.kind}`">
              <option
                v-for="name in templateNameSuggestions"
                :key="`suggest-${name}`"
                :value="name"
              />
            </datalist>
          </label>
          <label :class="styles.templateField">
            <span>Templates salvos</span>
            <select v-model="selectedTemplateId" @change="onSelectedTemplateChange">
              <option value="">Selecionar template</option>
              <option
                v-for="template in savedTemplates"
                :key="template.id"
                :value="template.id"
              >
                {{ template.name }} (uso {{ template.usageCount }})
              </option>
            </select>
          </label>
          <label :class="styles.templateField">
            <span>Versão do template</span>
            <select
              v-model="selectedTemplateVersion"
              :disabled="!selectedTemplate"
              @change="onTemplateVersionChange"
            >
              <option :value="null">Última versão</option>
              <option
                v-for="snapshot in selectedTemplateVersions"
                :key="`${selectedTemplate?.id ?? 'template'}-version-${snapshot.version}`"
                :value="snapshot.version"
              >
                v{{ snapshot.version }} • {{ snapshot.createdByEmail }}
              </option>
            </select>
          </label>
          <div :class="styles.templateActions">
            <button
              type="button"
              class="btn btn-xs btn-ghost"
              :disabled="!selectedTemplateId"
              @click="applySelectedTemplate"
            >
              Aplicar template
            </button>
            <button
              type="button"
              class="btn btn-xs btn-ghost"
              :disabled="!templateNameInput.trim()"
              @click="saveCurrentTemplate"
            >
              Salvar template
            </button>
            <button
              type="button"
              class="btn btn-xs btn-ghost"
              :disabled="!selectedTemplate"
              @click="removeSelectedTemplate"
            >
              Remover template
            </button>
          </div>
          <section v-if="templateDiffPreview" :class="styles.templateDiffPanel">
            <p :class="styles.templateDiff">
              Prévia v{{ templateDiffPreview.targetVersion }}: {{ templateDiffPreview.summary }}
            </p>
            <div :class="styles.templateDiffGrid">
              <article :class="styles.templateDiffBlock">
                <h6 :class="styles.templateDiffTitle">Mapeamentos</h6>
                <ul :class="styles.templateDiffList">
                  <li
                    v-if="!diffGroupHasChanges(templateDiffPreview.mapping)"
                    :class="styles.templateDiffEmpty"
                  >
                    Sem alterações.
                  </li>
                  <li
                    v-for="entry in templateDiffPreview.mapping.changed"
                    :key="`mapping-changed-${entry.key}`"
                    :class="[styles.templateDiffItem, styles.templateDiffItemChanged]"
                  >
                    {{ entry.key }}: {{ formatDiffValue(entry.from) }} -> {{ formatDiffValue(entry.to) }}
                  </li>
                  <li
                    v-for="entry in templateDiffPreview.mapping.added"
                    :key="`mapping-added-${entry.key}`"
                    :class="[styles.templateDiffItem, styles.templateDiffItemAdded]"
                  >
                    + {{ entry.key }}: {{ formatDiffValue(entry.to) }}
                  </li>
                  <li
                    v-for="entry in templateDiffPreview.mapping.removed"
                    :key="`mapping-removed-${entry.key}`"
                    :class="[styles.templateDiffItem, styles.templateDiffItemRemoved]"
                  >
                    - {{ entry.key }}: {{ formatDiffValue(entry.from) }}
                  </li>
                </ul>
              </article>

              <article :class="styles.templateDiffBlock">
                <h6 :class="styles.templateDiffTitle">Defaults</h6>
                <ul :class="styles.templateDiffList">
                  <li
                    v-if="!diffGroupHasChanges(templateDiffPreview.defaults)"
                    :class="styles.templateDiffEmpty"
                  >
                    Sem alterações.
                  </li>
                  <li
                    v-for="entry in templateDiffPreview.defaults.changed"
                    :key="`defaults-changed-${entry.key}`"
                    :class="[styles.templateDiffItem, styles.templateDiffItemChanged]"
                  >
                    {{ entry.key }}: {{ formatDiffValue(entry.from) }} -> {{ formatDiffValue(entry.to) }}
                  </li>
                  <li
                    v-for="entry in templateDiffPreview.defaults.added"
                    :key="`defaults-added-${entry.key}`"
                    :class="[styles.templateDiffItem, styles.templateDiffItemAdded]"
                  >
                    + {{ entry.key }}: {{ formatDiffValue(entry.to) }}
                  </li>
                  <li
                    v-for="entry in templateDiffPreview.defaults.removed"
                    :key="`defaults-removed-${entry.key}`"
                    :class="[styles.templateDiffItem, styles.templateDiffItemRemoved]"
                  >
                    - {{ entry.key }}: {{ formatDiffValue(entry.from) }}
                  </li>
                </ul>
              </article>
            </div>
          </section>
        </div>
        <div :class="styles.profileSection">
          <p :class="styles.profileTitle">Perfis rápidos</p>
          <div :class="styles.profileButtons">
            <button
              v-for="profile in availableProfiles"
              :key="profile.key"
              type="button"
              class="btn btn-xs btn-ghost"
              :class="[
                styles.profileButton,
                selectedProfileKey === profile.key && styles.profileButtonActive,
              ]"
              @click="applyProfile(profile)"
            >
              {{ profile.label }}
            </button>
          </div>
        </div>
        <div :class="styles.mappingGrid">
          <label
            v-for="field in sourceFields"
            :key="field.key"
            :class="styles.mappingField"
          >
            <span>
              {{ field.label }}<strong v-if="field.required">*</strong>
            </span>
            <select v-model="sourceColumnMapping[field.key]">
              <option value="">Ignorar</option>
              <option
                v-for="column in sourceColumns"
                :key="`${field.key}-${column}`"
                :value="column"
              >
                {{ column }}
              </option>
            </select>
          </label>
        </div>
        <section :class="styles.autofillSection">
          <label :class="styles.autofillToggle">
            <input v-model="useSourceDefaultAutofill" type="checkbox" />
            <span>Usar autofill para campos vazios</span>
          </label>
          <p :class="styles.autofillHint">
            Campos sem valor na origem podem receber defaults personalizados.
          </p>
          <div :class="styles.autofillGrid">
            <label
              v-for="field in sourceFields"
              :key="`default-${field.key}`"
              :class="styles.autofillField"
            >
              <span>{{ field.label }}</span>
              <template v-if="getAutofillOptions(field).length">
                <select v-model="sourceDefaultValues[field.key]">
                  <option value="">Sem default</option>
                  <option
                    v-for="option in getAutofillOptions(field)"
                    :key="`${field.key}-${option.value}`"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </template>
              <template v-else>
                <input
                  v-model="sourceDefaultValues[field.key]"
                  type="text"
                  placeholder="Valor default"
                />
              </template>
            </label>
          </div>
        </section>
        <div :class="styles.mappingActions">
          <button
            type="button"
            class="btn btn-xs btn-ghost"
            @click="applySuggestedSourceMapping"
          >
            Reaplicar sugestão automática
          </button>
          <button
            type="button"
            class="btn btn-xs btn-ghost"
            @click="clearSourceDefaultValues"
          >
            Limpar defaults
          </button>
        </div>
      </section>

      <p v-if="sourceImportHint" :class="styles.sourceHint">{{ sourceImportHint }}</p>

      <ul v-if="sourceWarnings.length" :class="styles.sourceWarnings">
        <li v-for="warning in sourceWarnings" :key="warning">{{ warning }}</li>
      </ul>

      <details v-if="sourceRejectedRows.length" :class="styles.rejectedDetails">
        <summary>
          {{ sourceRejectedRows.length }} registro(s) rejeitado(s). Clique para revisar.
        </summary>
        <ul :class="styles.rejectedList">
          <li
            v-for="row in visibleRejectedRows"
            :key="`${row.rowNumber}-${row.reason}`"
            :class="styles.rejectedItem"
          >
            <strong>Linha {{ row.rowNumber }}</strong>
            <span>{{ row.reason }}</span>
            <small v-if="formatRejectedErrors(row)">
              {{ formatRejectedErrors(row) }}
            </small>
          </li>
        </ul>
        <p v-if="hiddenRejectedRowsCount > 0" :class="styles.rejectedMore">
          +{{ hiddenRejectedRowsCount }} registro(s) adicional(is) não exibido(s).
        </p>
      </details>
    </section>

    <form
      v-if="!isCollapsed"
      :class="styles.formSection"
      novalidate
      @submit.prevent="addToPreview"
    >
      <template v-if="props.kind === 'clients'">
        <fieldset :class="styles.formFieldset">
          <legend :class="styles.formLegend">Identificação</legend>
          <div :class="styles.gridTwo">
            <label :class="styles.field">
              <span>Nome *</span>
              <input
                v-model="(draft as ClientImportDraft).name"
                :class="[styles.inputWithIcon, inputIconClass('name')]"
                :list="datalistIdForField('name')"
                type="text"
                required
                placeholder="Ex.: Ana Souza"
                autocomplete="name"
                autocapitalize="words"
                :data-invalid="fieldErrors.name ? 'true' : undefined"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('name')">
                <option
                  v-for="suggestion in resolveInputSuggestions('name', (draft as ClientImportDraft).name)"
                  :key="`clients-name-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.name">{{ fieldErrors.name }}</small>
            </label>

            <label :class="styles.field">
              <span>Tipo *</span>
              <select
                v-model="(draft as ClientImportDraft).type"
                required
                :data-invalid="fieldErrors.type ? 'true' : undefined"
                @change="handleClientTypeChange"
              >
                <option
                  v-for="option in clientTypeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <small v-if="fieldErrors.type">{{ fieldErrors.type }}</small>
            </label>
          </div>

          <div :class="styles.gridTwo">
            <label :class="styles.field">
              <span>Empresa</span>
              <input
                v-model="(draft as ClientImportDraft).company"
                :class="[styles.inputWithIcon, inputIconClass('company')]"
                :list="datalistIdForField('company')"
                type="text"
                placeholder="Ex.: Nexo Tecnologia"
                autocomplete="organization"
                autocapitalize="words"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('company')">
                <option
                  v-for="suggestion in resolveInputSuggestions('company', (draft as ClientImportDraft).company)"
                  :key="`clients-company-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
            </label>

            <label :class="styles.field">
              <span>E-mail</span>
              <input
                v-model="(draft as ClientImportDraft).email"
                :class="[styles.inputWithIcon, inputIconClass('email')]"
                :list="datalistIdForField('email')"
                type="email"
                placeholder="contato@empresa.com"
                autocomplete="email"
                autocapitalize="none"
                :data-invalid="fieldErrors.email ? 'true' : undefined"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('email')">
                <option
                  v-for="suggestion in resolveInputSuggestions('email', (draft as ClientImportDraft).email)"
                  :key="`clients-email-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.email">{{ fieldErrors.email }}</small>
            </label>
          </div>

          <div v-if="isCompanyDraft" :class="styles.gridTwo">
            <label :class="styles.field">
              <span>CNPJ *</span>
              <input
                v-model="(draft as ClientImportDraft).cnpj"
                :class="[styles.inputWithIcon, inputIconClass('cnpj')]"
                :list="datalistIdForField('cnpj')"
                type="text"
                inputmode="numeric"
                required
                :pattern="ImportFieldRules.CNPJ_PATTERN_ATTR"
                placeholder="00.000.000/0000-00"
                autocomplete="off"
                :data-invalid="fieldErrors.cnpj ? 'true' : undefined"
                @blur="(draft as ClientImportDraft).cnpj = ImportFieldRules.normalizeCnpj((draft as ClientImportDraft).cnpj)"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('cnpj')">
                <option
                  v-for="suggestion in resolveInputSuggestions('cnpj', (draft as ClientImportDraft).cnpj)"
                  :key="`clients-cnpj-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.cnpj">{{ fieldErrors.cnpj }}</small>
            </label>

            <label :class="styles.field">
              <span>CEP *</span>
              <input
                v-model="(draft as ClientImportDraft).cep"
                :class="[styles.inputWithIcon, inputIconClass('cep')]"
                :list="datalistIdForField('cep')"
                type="text"
                inputmode="numeric"
                required
                :pattern="ImportFieldRules.CEP_PATTERN_ATTR"
                placeholder="00000-000"
                autocomplete="postal-code"
                :data-invalid="fieldErrors.cep ? 'true' : undefined"
                @blur="(draft as ClientImportDraft).cep = ImportFieldRules.normalizeCep((draft as ClientImportDraft).cep)"
                @change="handleCepChange"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('cep')">
                <option
                  v-for="suggestion in resolveInputSuggestions('cep', (draft as ClientImportDraft).cep)"
                  :key="`clients-cep-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.cep">{{ fieldErrors.cep }}</small>
              <small v-else-if="cepLookupHint">{{ cepLookupHint }}</small>
            </label>
          </div>
        </fieldset>

        <fieldset :class="styles.formFieldset">
          <legend :class="styles.formLegend">Contato</legend>
          <div :class="styles.gridTwo">
            <label :class="styles.field">
              <span>Telefone</span>
              <input
                v-model="(draft as ClientImportDraft).phone"
                :class="[styles.inputWithIcon, inputIconClass('phone')]"
                :list="datalistIdForField('phone')"
                type="tel"
                placeholder="(11) 3333-3333"
                autocomplete="tel"
                :data-invalid="fieldErrors.phone ? 'true' : undefined"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('phone')">
                <option
                  v-for="suggestion in resolveInputSuggestions('phone', (draft as ClientImportDraft).phone)"
                  :key="`clients-phone-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.phone">{{ fieldErrors.phone }}</small>
            </label>

            <label :class="styles.field">
              <span>Celular</span>
              <input
                v-model="(draft as ClientImportDraft).cellPhone"
                :class="[styles.inputWithIcon, inputIconClass('cellPhone')]"
                :list="datalistIdForField('cellPhone')"
                type="tel"
                placeholder="(11) 99999-9999"
                autocomplete="tel-national"
                :data-invalid="fieldErrors.cellPhone ? 'true' : undefined"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('cellPhone')">
                <option
                  v-for="suggestion in resolveInputSuggestions('cellPhone', (draft as ClientImportDraft).cellPhone)"
                  :key="`clients-cell-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.cellPhone">{{ fieldErrors.cellPhone }}</small>
            </label>
          </div>

          <div :class="styles.gridTwo">
            <label :class="styles.field">
              <span>WhatsApp</span>
              <input
                v-model="(draft as ClientImportDraft).whatsappNumber"
                :class="[styles.inputWithIcon, inputIconClass('whatsappNumber')]"
                :list="datalistIdForField('whatsappNumber')"
                type="tel"
                placeholder="(11) 98888-8888"
                autocomplete="tel"
                :data-invalid="fieldErrors.whatsappNumber ? 'true' : undefined"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('whatsappNumber')">
                <option
                  v-for="suggestion in resolveInputSuggestions('whatsappNumber', (draft as ClientImportDraft).whatsappNumber)"
                  :key="`clients-whatsapp-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.whatsappNumber">{{
                fieldErrors.whatsappNumber
              }}</small>
            </label>

            <label :class="styles.field">
              <span>Contato preferido *</span>
              <select
                v-model="(draft as ClientImportDraft).preferredContact"
                required
                :data-invalid="fieldErrors.preferredContact ? 'true' : undefined"
                @change="refreshSyncErrors"
              >
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
                <option value="cellphone">Celular</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <small v-if="fieldErrors.preferredContact">{{
                fieldErrors.preferredContact
              }}</small>
            </label>
          </div>
        </fieldset>

        <fieldset :class="styles.formFieldset">
          <legend :class="styles.formLegend">Notas</legend>
          <label :class="styles.field">
            <span>Notas</span>
            <textarea
              v-model="(draft as ClientImportDraft).notes"
              rows="3"
              placeholder="Contexto livre, observações de origem e campos extras."
              @input="refreshSyncErrors"
            ></textarea>
          </label>
        </fieldset>
      </template>

      <template v-else-if="props.kind === 'projects'">
        <fieldset :class="styles.formFieldset">
          <legend :class="styles.formLegend">Identificação</legend>
          <div :class="styles.gridTwo">
            <label :class="styles.field">
              <span>Nome do projeto *</span>
              <input
                v-model="(draft as ProjectImportDraft).name"
                :class="[styles.inputWithIcon, inputIconClass('name')]"
                :list="datalistIdForField('name')"
                type="text"
                required
                placeholder="Ex.: Projeto Orion"
                autocapitalize="words"
                :data-invalid="fieldErrors.name ? 'true' : undefined"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('name')">
                <option
                  v-for="suggestion in resolveInputSuggestions('name', (draft as ProjectImportDraft).name)"
                  :key="`projects-name-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.name">{{ fieldErrors.name }}</small>
            </label>

            <label :class="styles.field">
              <span>Código</span>
              <input
                v-model="(draft as ProjectImportDraft).code"
                :class="[styles.inputWithIcon, inputIconClass('code')]"
                :list="datalistIdForField('code')"
                type="text"
                placeholder="Ex.: ORN-102"
                autocomplete="off"
                :data-invalid="fieldErrors.code ? 'true' : undefined"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('code')">
                <option
                  v-for="suggestion in resolveInputSuggestions('code', (draft as ProjectImportDraft).code)"
                  :key="`projects-code-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.code">{{ fieldErrors.code }}</small>
            </label>
          </div>
        </fieldset>

        <fieldset :class="styles.formFieldset">
          <legend :class="styles.formLegend">Planejamento</legend>
          <div :class="styles.gridTwo">
            <label :class="styles.field">
              <span>Status *</span>
              <select
                v-model="(draft as ProjectImportDraft).status"
                required
                :data-invalid="fieldErrors.status ? 'true' : undefined"
                @change="refreshSyncErrors"
              >
                <option
                  v-for="status in projectStatusOptions"
                  :key="status"
                  :value="status"
                >
                  {{ status }}
                </option>
              </select>
              <small v-if="fieldErrors.status">{{ fieldErrors.status }}</small>
            </label>

            <label :class="styles.field">
              <span>Responsável (e-mail)</span>
              <input
                v-model="(draft as ProjectImportDraft).ownerEmail"
                :class="[styles.inputWithIcon, inputIconClass('ownerEmail')]"
                :list="datalistIdForField('ownerEmail')"
                type="email"
                placeholder="gestor@empresa.com"
                autocomplete="email"
                :data-invalid="fieldErrors.ownerEmail ? 'true' : undefined"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('ownerEmail')">
                <option
                  v-for="suggestion in resolveInputSuggestions('ownerEmail', (draft as ProjectImportDraft).ownerEmail)"
                  :key="`projects-owner-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.ownerEmail">{{ fieldErrors.ownerEmail }}</small>
            </label>
          </div>

          <div :class="styles.gridTwo">
            <label :class="styles.field">
              <span>Previsão (YYYY-MM-DD)</span>
              <input
                v-model="(draft as ProjectImportDraft).dueAt"
                type="date"
                :data-invalid="fieldErrors.dueAt ? 'true' : undefined"
                @change="refreshSyncErrors"
              />
              <small v-if="fieldErrors.dueAt">{{ fieldErrors.dueAt }}</small>
            </label>

            <label :class="styles.field">
              <span>Entrega (YYYY-MM-DD)</span>
              <input
                v-model="(draft as ProjectImportDraft).deadlineAt"
                type="date"
                :data-invalid="fieldErrors.deadlineAt ? 'true' : undefined"
                @change="refreshSyncErrors"
              />
              <small v-if="fieldErrors.deadlineAt">{{ fieldErrors.deadlineAt }}</small>
            </label>
          </div>
        </fieldset>

        <fieldset :class="styles.formFieldset">
          <legend :class="styles.formLegend">Contexto</legend>
          <label :class="styles.field">
            <span>Tags (separadas por vírgula)</span>
            <input
              v-model="(draft as ProjectImportDraft).tags"
              :class="[styles.inputWithIcon, inputIconClass('tags')]"
              :list="datalistIdForField('tags')"
              type="text"
              placeholder="backend, prioridade, sprint-12"
              autocomplete="off"
              @input="refreshSyncErrors"
            />
            <datalist :id="datalistIdForField('tags')">
              <option
                v-for="suggestion in resolveInputSuggestions('tags', (draft as ProjectImportDraft).tags)"
                :key="`projects-tags-${suggestion}`"
                :value="suggestion"
              />
            </datalist>
          </label>

          <label :class="styles.field">
            <span>Descrição</span>
            <textarea
              v-model="(draft as ProjectImportDraft).description"
              rows="3"
              placeholder="Resumo objetivo do projeto e escopo."
              @input="refreshSyncErrors"
            ></textarea>
          </label>

          <label :class="styles.field">
            <span>Notas</span>
            <textarea
              v-model="(draft as ProjectImportDraft).notes"
              rows="3"
              placeholder="Campos extras não mapeados e observações do import."
              @input="refreshSyncErrors"
            ></textarea>
          </label>
        </fieldset>
      </template>

      <template v-else>
        <fieldset :class="styles.formFieldset">
          <legend :class="styles.formLegend">Conta</legend>
          <div :class="styles.gridTwo">
            <label :class="styles.field">
              <span>E-mail *</span>
              <input
                v-model="(draft as UserImportDraft).email"
                :class="[styles.inputWithIcon, inputIconClass('email')]"
                :list="datalistIdForField('email')"
                type="email"
                required
                placeholder="usuario@empresa.com"
                autocomplete="email"
                autocapitalize="none"
                :data-invalid="fieldErrors.email ? 'true' : undefined"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('email')">
                <option
                  v-for="suggestion in resolveInputSuggestions('email', (draft as UserImportDraft).email)"
                  :key="`users-email-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
              <small v-if="fieldErrors.email">{{ fieldErrors.email }}</small>
            </label>

            <label :class="styles.field">
              <span>Perfil *</span>
              <select
                v-model="(draft as UserImportDraft).roleKey"
                required
                :data-invalid="fieldErrors.roleKey ? 'true' : undefined"
                @change="refreshSyncErrors"
              >
                <option v-for="role in roleOptions" :key="role" :value="role">
                  {{ role }}
                </option>
              </select>
              <small v-if="fieldErrors.roleKey">{{ fieldErrors.roleKey }}</small>
            </label>
          </div>
        </fieldset>

        <fieldset :class="styles.formFieldset">
          <legend :class="styles.formLegend">Perfil profissional</legend>
          <div :class="styles.gridTwo">
            <label :class="styles.field">
              <span>Nome</span>
              <input
                v-model="(draft as UserImportDraft).firstName"
                :class="[styles.inputWithIcon, inputIconClass('firstName')]"
                :list="datalistIdForField('firstName')"
                type="text"
                placeholder="Ex.: Ana"
                autocomplete="given-name"
                autocapitalize="words"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('firstName')">
                <option
                  v-for="suggestion in resolveInputSuggestions('firstName', (draft as UserImportDraft).firstName)"
                  :key="`users-first-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
            </label>

            <label :class="styles.field">
              <span>Sobrenome</span>
              <input
                v-model="(draft as UserImportDraft).lastName"
                :class="[styles.inputWithIcon, inputIconClass('lastName')]"
                :list="datalistIdForField('lastName')"
                type="text"
                placeholder="Ex.: Souza"
                autocomplete="family-name"
                autocapitalize="words"
                @input="refreshSyncErrors"
              />
              <datalist :id="datalistIdForField('lastName')">
                <option
                  v-for="suggestion in resolveInputSuggestions('lastName', (draft as UserImportDraft).lastName)"
                  :key="`users-last-${suggestion}`"
                  :value="suggestion"
                />
              </datalist>
            </label>
          </div>

          <label :class="styles.field">
            <span>Departamento</span>
            <input
              v-model="(draft as UserImportDraft).department"
              :class="[styles.inputWithIcon, inputIconClass('department')]"
              :list="datalistIdForField('department')"
              type="text"
              placeholder="Ex.: Operações"
              autocomplete="organization-title"
              autocapitalize="words"
              @input="refreshSyncErrors"
            />
            <datalist :id="datalistIdForField('department')">
              <option
                v-for="suggestion in resolveInputSuggestions('department', (draft as UserImportDraft).department)"
                :key="`users-department-${suggestion}`"
                :value="suggestion"
              />
            </datalist>
          </label>
        </fieldset>

        <fieldset :class="styles.formFieldset">
          <legend :class="styles.formLegend">Contato e notas</legend>
          <label :class="styles.field">
            <span>Telefone</span>
            <input
              v-model="(draft as UserImportDraft).phone"
              :class="[styles.inputWithIcon, inputIconClass('phone')]"
              :list="datalistIdForField('phone')"
              type="tel"
              placeholder="+55 11 99999-9999"
              autocomplete="tel"
              :data-invalid="fieldErrors.phone ? 'true' : undefined"
              @input="refreshSyncErrors"
            />
            <datalist :id="datalistIdForField('phone')">
              <option
                v-for="suggestion in resolveInputSuggestions('phone', (draft as UserImportDraft).phone)"
                :key="`users-phone-${suggestion}`"
                :value="suggestion"
              />
            </datalist>
            <small v-if="fieldErrors.phone">{{ fieldErrors.phone }}</small>
          </label>

          <label :class="styles.field">
            <span>Notas</span>
            <textarea
              v-model="(draft as UserImportDraft).notes"
              rows="3"
              placeholder="Observações de importação e campos extras."
              @input="refreshSyncErrors"
            ></textarea>
          </label>
        </fieldset>
      </template>

      <p v-if="validationHint" :class="styles.formHint">{{ validationHint }}</p>

      <div :class="styles.formActions">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!canAddDraft"
          :aria-disabled="!canAddDraft"
        >
          {{ isAdding ? "Adicionando..." : "Adicionar à prévia" }}
        </button>
      </div>
    </form>

    <section :class="styles.previewSection">
      <header :class="styles.previewHeader">
        <h4 :class="styles.previewTitle">Prévia e aprovação</h4>
        <div :class="styles.previewControls">
          <button
            type="button"
            class="btn btn-xs btn-ghost"
            title="Aprovar todos da prévia"
            @click="setAllApproved(true)"
          >
            Aprovar todos
          </button>
          <button
            type="button"
            class="btn btn-xs btn-ghost"
            title="Desmarcar todos da prévia"
            @click="setAllApproved(false)"
          >
            Limpar seleção
          </button>
        </div>
      </header>
      <p :class="styles.previewLead">
        Isto foi importado. O que você aprova para enviar ao sistema?
      </p>

      <ul v-if="previewRows.length" :class="styles.previewList">
        <li
          v-for="item in previewRows"
          :key="item.id"
          :class="[
            styles.previewItem,
            item.status === 'failed' && styles.previewItemFailed,
            item.status === 'success' && styles.previewItemSuccess,
          ]"
        >
          <label :class="styles.previewCheck">
            <input
              type="checkbox"
              :checked="item.approved"
              :disabled="item.status === 'success'"
              @change="toggleApproval(item.id)"
            />
            <span>{{ item.summary }}</span>
          </label>
          <span :class="styles.previewStatus">{{ statusLabel(item.status) }}</span>
          <small v-if="item.error" :class="styles.previewError">{{ item.error }}</small>
          <button
            type="button"
            class="btn btn-xs btn-ghost"
            title="Remover item da prévia"
            @click="removePreviewRow(item.id)"
          >
            Remover
          </button>
        </li>
      </ul>
      <p v-else :class="styles.previewEmpty">
        Nenhum registro adicionado ainda.
      </p>

      <footer :class="styles.previewFooter">
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          Fechar
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!hasApprovedRows || isSubmitting"
          :aria-disabled="!hasApprovedRows || isSubmitting"
          @click="submitApproved"
        >
          {{
            isSubmitting
              ? "Enviando..."
              : `Enviar aprovados (${approvedRows.length})`
          }}
        </button>
      </footer>
    </section>
  </section>
</template>
