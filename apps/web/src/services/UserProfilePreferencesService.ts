import StorageService from "./StorageService";

export const PROFILE_PREFERENCES_UPDATED_EVENT = "profile:preferences:updated";

export const PROFILE_DEPARTMENT_OPTIONS = Object.freeze([
  "Produto",
  "Operações",
  "Vendas",
  "Marketing",
  "Financeiro",
  "Atendimento",
  "Tecnologia",
  "Recursos Humanos",
  "Outro",
]);

export type ProfileWorkMode = "focus" | "balanced" | "collaborative";

export const PROFILE_WORK_MODE_OPTIONS = Object.freeze([
  {
    value: "focus" as ProfileWorkMode,
    label: "Foco",
    description: "Prefiro blocos longos de concentração.",
  },
  {
    value: "balanced" as ProfileWorkMode,
    label: "Equilíbrio",
    description: "Alterno entre foco individual e colaboração.",
  },
  {
    value: "collaborative" as ProfileWorkMode,
    label: "Colaborativo",
    description: "Trabalho melhor com checkpoints em equipe.",
  },
]);

export type ProfileInterest =
  | "crm"
  | "automations"
  | "analytics"
  | "projects"
  | "sales"
  | "support"
  | "integrations"
  | "leadership";

export const PROFILE_INTEREST_OPTIONS = Object.freeze([
  { value: "crm" as ProfileInterest, label: "CRM" },
  { value: "automations" as ProfileInterest, label: "Automações" },
  { value: "analytics" as ProfileInterest, label: "Analytics" },
  { value: "projects" as ProfileInterest, label: "Projetos" },
  { value: "sales" as ProfileInterest, label: "Vendas" },
  { value: "support" as ProfileInterest, label: "Suporte" },
  { value: "integrations" as ProfileInterest, label: "Integrações" },
  { value: "leadership" as ProfileInterest, label: "Liderança" },
]);

export const PROFILE_INTERESTS_MAX = 5;

export type ProfileDashboardPreferences = {
  showEmailInTopBar: boolean;
  compactDashboardCards: boolean;
  weeklyDigest: boolean;
  taskReminders: boolean;
};

export type ProfileCommunicationPreferences = {
  conciseUpdates: boolean;
  includeExamples: boolean;
  celebrateMilestones: boolean;
};

export type UserProfilePreferences = {
  preferredName: string;
  headline: string;
  department: string;
  pronouns: string;
  bio: string;
  workMode: ProfileWorkMode;
  interests: ProfileInterest[];
  dashboard: ProfileDashboardPreferences;
  communication: ProfileCommunicationPreferences;
};

const STORAGE_KEY = "profile.preferences.v1";
const VALID_WORK_MODES = new Set<ProfileWorkMode>(
  PROFILE_WORK_MODE_OPTIONS.map((item) => item.value),
);
const VALID_INTERESTS = new Set<ProfileInterest>(
  PROFILE_INTEREST_OPTIONS.map((item) => item.value),
);
const VALID_DEPARTMENTS = new Set<string>(PROFILE_DEPARTMENT_OPTIONS);

const DEFAULT_PREFERENCES = Object.freeze({
  preferredName: "",
  headline: "",
  department: "Produto",
  pronouns: "",
  bio: "",
  workMode: "balanced" as ProfileWorkMode,
  interests: ["crm", "projects"] as ProfileInterest[],
  dashboard: {
    showEmailInTopBar: true,
    compactDashboardCards: false,
    weeklyDigest: true,
    taskReminders: true,
  } as ProfileDashboardPreferences,
  communication: {
    conciseUpdates: true,
    includeExamples: true,
    celebrateMilestones: false,
  } as ProfileCommunicationPreferences,
}) satisfies UserProfilePreferences;

const toTrimmedText = (value: unknown, maxLength: number): string => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const cloneDefaults = (): UserProfilePreferences => ({
  preferredName: DEFAULT_PREFERENCES.preferredName,
  headline: DEFAULT_PREFERENCES.headline,
  department: DEFAULT_PREFERENCES.department,
  pronouns: DEFAULT_PREFERENCES.pronouns,
  bio: DEFAULT_PREFERENCES.bio,
  workMode: DEFAULT_PREFERENCES.workMode,
  interests: [...DEFAULT_PREFERENCES.interests],
  dashboard: {
    ...DEFAULT_PREFERENCES.dashboard,
  },
  communication: {
    ...DEFAULT_PREFERENCES.communication,
  },
});

const sanitizePreferences = (input: unknown): UserProfilePreferences => {
  const source = input && typeof input === "object" ? input : {};
  const defaults = cloneDefaults();
  const raw = source as Record<string, unknown>;

  const workMode = VALID_WORK_MODES.has(raw.workMode as ProfileWorkMode)
    ? (raw.workMode as ProfileWorkMode)
    : defaults.workMode;

  const department = VALID_DEPARTMENTS.has(String(raw.department ?? ""))
    ? String(raw.department)
    : defaults.department;

  const interests = Array.isArray(raw.interests)
    ? raw.interests.filter((item): item is ProfileInterest =>
        VALID_INTERESTS.has(item as ProfileInterest),
      )
    : defaults.interests;

  const uniqueInterests = [...new Set(interests)].slice(
    0,
    PROFILE_INTERESTS_MAX,
  );
  const dashboardRaw =
    raw.dashboard && typeof raw.dashboard === "object"
      ? (raw.dashboard as Record<string, unknown>)
      : {};
  const communicationRaw =
    raw.communication && typeof raw.communication === "object"
      ? (raw.communication as Record<string, unknown>)
      : {};

  return {
    preferredName: toTrimmedText(raw.preferredName, 48),
    headline: toTrimmedText(raw.headline, 72),
    department,
    pronouns: toTrimmedText(raw.pronouns, 32),
    bio: toTrimmedText(raw.bio, 280),
    workMode,
    interests: uniqueInterests.length ? uniqueInterests : defaults.interests,
    dashboard: {
      showEmailInTopBar: toBoolean(
        dashboardRaw.showEmailInTopBar,
        defaults.dashboard.showEmailInTopBar,
      ),
      compactDashboardCards: toBoolean(
        dashboardRaw.compactDashboardCards,
        defaults.dashboard.compactDashboardCards,
      ),
      weeklyDigest: toBoolean(
        dashboardRaw.weeklyDigest,
        defaults.dashboard.weeklyDigest,
      ),
      taskReminders: toBoolean(
        dashboardRaw.taskReminders,
        defaults.dashboard.taskReminders,
      ),
    },
    communication: {
      conciseUpdates: toBoolean(
        communicationRaw.conciseUpdates,
        defaults.communication.conciseUpdates,
      ),
      includeExamples: toBoolean(
        communicationRaw.includeExamples,
        defaults.communication.includeExamples,
      ),
      celebrateMilestones: toBoolean(
        communicationRaw.celebrateMilestones,
        defaults.communication.celebrateMilestones,
      ),
    },
  };
};

const notifyPreferencesUpdated = (detail: UserProfilePreferences): void => {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<UserProfilePreferences>(PROFILE_PREFERENCES_UPDATED_EVENT, {
      detail,
    }),
  );
};

export default class UserProfilePreferencesService {
  static load(): UserProfilePreferences {
    const stored = StorageService.local.getJson<unknown>(
      STORAGE_KEY,
      cloneDefaults(),
    );
    return sanitizePreferences(stored);
  }

  static save(nextPreferences: unknown): UserProfilePreferences {
    const normalized = sanitizePreferences(nextPreferences);
    StorageService.local.setJson(STORAGE_KEY, normalized);
    notifyPreferencesUpdated(normalized);
    return normalized;
  }

  static reset(): UserProfilePreferences {
    const defaults = cloneDefaults();
    StorageService.local.setJson(STORAGE_KEY, defaults);
    notifyPreferencesUpdated(defaults);
    return defaults;
  }
}
