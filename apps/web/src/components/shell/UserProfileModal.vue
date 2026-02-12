<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import { useAuthStore } from "../../pinia/stores/auth.store";
import { usePolicyStore } from "../../pinia/stores/policy.store";
import AlertService from "../../services/AlertService";
import ModalService from "../../services/ModalService";
import SafeJsonService from "../../services/SafeJsonService";
import UserProfilePreferencesService, {
  PROFILE_DEPARTMENT_OPTIONS,
  PROFILE_INTERESTS_MAX,
  PROFILE_INTEREST_OPTIONS,
  PROFILE_WORK_MODE_OPTIONS,
  type ProfileInterest,
  type ProfileWorkMode,
  type UserProfilePreferences,
} from "../../services/UserProfilePreferencesService";

const ChangeEmailModal = defineAsyncComponent(
  () => import("../auth/ChangeEmailModal.vue"),
);
const ChangePasswordModal = defineAsyncComponent(
  () => import("../auth/ChangePasswordModal.vue"),
);

const emit = defineEmits<{
  (e: "close"): void;
}>();

type ProfileModalTab = "account" | "preferences";
type ProfileAccountStatusTone = "active" | "disabled" | "locked";

type ProfileUser = Readonly<{
  id?: string;
  _id?: string;
  email?: string;
  name?: string;
  role?: string;
  roles?: readonly string[];
  disabled?: boolean;
  locked?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}>;

type DashboardToggleKey = keyof UserProfilePreferences["dashboard"];
type CommunicationToggleKey = keyof UserProfilePreferences["communication"];

const AVATAR_STORAGE_KEY = "profile-avatar";

const dashboardToggleOptions: ReadonlyArray<{
  key: DashboardToggleKey;
  label: string;
  description: string;
}> = [
  {
    key: "showEmailInTopBar",
    label: "Mostrar e-mail no topo",
    description: "Controla a exibição do e-mail no badge da barra superior.",
  },
  {
    key: "compactDashboardCards",
    label: "Cartões compactos",
    description: "Usa uma visualização mais condensada no dashboard.",
  },
  {
    key: "weeklyDigest",
    label: "Resumo semanal",
    description: "Habilita lembretes com um resumo das prioridades da semana.",
  },
  {
    key: "taskReminders",
    label: "Lembretes de tarefas",
    description: "Mostra avisos para itens com prazo próximo.",
  },
] as const;

const communicationToggleOptions: ReadonlyArray<{
  key: CommunicationToggleKey;
  label: string;
  description: string;
}> = [
  {
    key: "conciseUpdates",
    label: "Atualizações curtas",
    description: "Prefere mensagens objetivas no acompanhamento diário.",
  },
  {
    key: "includeExamples",
    label: "Incluir exemplos",
    description: "Recebe explicações com exemplos em mensagens guiadas.",
  },
  {
    key: "celebrateMilestones",
    label: "Celebrar marcos",
    description: "Destaca conquistas e marcos concluídos no seu fluxo.",
  },
] as const;

const workModeLabelMap = new Map<ProfileWorkMode, string>(
  PROFILE_WORK_MODE_OPTIONS.map((option) => [
    option.value,
    option.label,
  ]) as Array<[ProfileWorkMode, string]>,
);

const interestLabelMap = new Map<ProfileInterest, string>(
  PROFILE_INTEREST_OPTIONS.map((option) => [
    option.value,
    option.label,
  ]) as Array<[ProfileInterest, string]>,
);

const formatDate = (
  raw: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string => {
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", options);
};

const makeSnapshot = (value: UserProfilePreferences): string =>
  SafeJsonService.stringify(value, "{}");

const auth = useAuthStore();
const policy = usePolicyStore();

const me = computed<ProfileUser | null>(() =>
  auth.me ? (auth.me as unknown as ProfileUser) : null,
);

const email = computed(() => me.value?.email ?? "—");
const displayName = computed(() => {
  const userName = me.value?.name;
  if (typeof userName === "string" && userName.trim()) {
    return userName.trim();
  }

  const currentEmail = email.value;
  if (currentEmail && currentEmail !== "—") {
    const [namePart] = currentEmail.split("@");
    if (namePart) {
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
  }

  return "Usuário";
});

const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2),
);

const roles = computed<string[]>(() => {
  const base = Array.isArray(me.value?.roles)
    ? me.value?.roles.map((role) => String(role))
    : [];

  const primaryRole = me.value?.role ? String(me.value.role) : "";
  if (primaryRole && !base.includes(primaryRole)) {
    base.unshift(primaryRole);
  }

  return base;
});

const permissions = computed<string[]>(() =>
  Array.isArray(policy.perms) ? [...policy.perms] : [],
);

const accountCreated = computed(() =>
  formatDate(me.value?.createdAt, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
);

const lastLogin = computed(() =>
  formatDate(me.value?.lastLoginAt, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }),
);

const accountStatusTone = computed<ProfileAccountStatusTone>(() => {
  if (me.value?.disabled) return "disabled";
  if (me.value?.locked) return "locked";
  return "active";
});

const accountStatusLabel = computed(() => {
  if (accountStatusTone.value === "disabled") return "Desativada";
  if (accountStatusTone.value === "locked") return "Bloqueada";
  return "Ativa";
});

const userId = computed(() => me.value?.id || me.value?._id || "—");

const activeTab = ref<ProfileModalTab>("account");
const preferences = ref<UserProfilePreferences>(
  UserProfilePreferencesService.load(),
);
const savedSnapshot = ref(makeSnapshot(preferences.value));
const isSaving = ref(false);

const previewName = computed(
  () => preferences.value.preferredName.trim() || displayName.value,
);
const previewHeadline = computed(
  () => preferences.value.headline.trim() || "Profissional CRM",
);
const currentWorkModeLabel = computed(
  () => workModeLabelMap.get(preferences.value.workMode) ?? "Equilíbrio",
);
const selectedInterestLabels = computed(() =>
  preferences.value.interests.map(
    (interest) => interestLabelMap.get(interest) ?? interest,
  ),
);

const bioRemaining = computed(() => Math.max(0, 280 - preferences.value.bio.length));
const selectedInterestCount = computed(() => preferences.value.interests.length);
const isDirty = computed(
  () => makeSnapshot(preferences.value) !== savedSnapshot.value,
);

const photoInput = ref<HTMLInputElement | null>(null);
const avatarUrl = ref<string | null>(null);

const loadStoredAvatar = () => {
  try {
    const stored = localStorage.getItem(AVATAR_STORAGE_KEY);
    avatarUrl.value = stored || null;
  } catch (error) {
    console.warn("[UserProfileModal] Failed to load avatar:", error);
    avatarUrl.value = null;
  }
};
loadStoredAvatar();

const triggerPhotoUpload = () => {
  photoInput.value?.click();
};

const openChangeEmail = async () => {
  emit("close");
  await ModalService.open(ChangeEmailModal, {
    title: "Alterar e-mail",
    size: "sm",
  });
};

const openChangePassword = async () => {
  emit("close");
  await ModalService.open(ChangePasswordModal, {
    title: "Alterar senha",
    size: "sm",
  });
};

const handlePhotoChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    await AlertService.error("Arquivo inválido", "Selecione um arquivo de imagem.");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    await AlertService.error("Arquivo muito grande", "O limite é de 2 MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    avatarUrl.value = dataUrl;
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
    } catch (error) {
      console.warn("[UserProfileModal] Failed to store avatar:", error);
    }
  };
  reader.readAsDataURL(file);

  await AlertService.success(
    "Foto atualizada",
    "A nova foto foi aplicada no seu perfil local.",
  );
};

const setTab = (tab: ProfileModalTab) => {
  activeTab.value = tab;
};

const setWorkMode = (mode: ProfileWorkMode) => {
  preferences.value.workMode = mode;
};

const toggleInterest = async (interest: ProfileInterest): Promise<void> => {
  const currentIndex = preferences.value.interests.indexOf(interest);
  if (currentIndex >= 0) {
    preferences.value.interests.splice(currentIndex, 1);
    return;
  }

  if (preferences.value.interests.length >= PROFILE_INTERESTS_MAX) {
    await AlertService.error(
      "Limite atingido",
      `Selecione até ${PROFILE_INTERESTS_MAX} interesses por perfil.`,
    );
    return;
  }

  preferences.value.interests.push(interest);
};

const discardPreferenceDraft = () => {
  const persisted = UserProfilePreferencesService.load();
  preferences.value = persisted;
};

const restoreDefaultPreferences = async () => {
  const defaults = UserProfilePreferencesService.reset();
  preferences.value = defaults;
  savedSnapshot.value = makeSnapshot(defaults);

  await AlertService.success(
    "Preferências restauradas",
    "Seu perfil voltou para a configuração padrão.",
  );
};

const savePreferences = async () => {
  isSaving.value = true;
  try {
    const saved = UserProfilePreferencesService.save(preferences.value);
    preferences.value = saved;
    savedSnapshot.value = makeSnapshot(saved);

    await AlertService.success(
      "Perfil atualizado",
      "As preferências foram salvas com sucesso.",
    );
  } catch (error) {
    console.error("[UserProfileModal] Failed to save preferences:", error);
    await AlertService.error("Falha ao salvar perfil", error);
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="profile-modal">
    <header class="profile-modal__hero">
      <div
        class="profile-modal__avatar-wrap"
        @click="triggerPhotoUpload"
        title="Trocar foto"
      >
        <div
          v-if="avatarUrl"
          class="profile-modal__avatar profile-modal__avatar--image"
        >
          <img :src="avatarUrl" alt="Foto de perfil" />
        </div>
        <div v-else class="profile-modal__avatar">{{ initials }}</div>

        <div class="profile-modal__avatar-overlay">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <path
              d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
            />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>

        <input
          ref="photoInput"
          type="file"
          accept="image/*"
          class="sr-only"
          @change="handlePhotoChange"
        />
      </div>

      <div class="profile-modal__hero-copy">
        <h3 class="profile-modal__hero-name">{{ previewName }}</h3>
        <p class="profile-modal__hero-headline">{{ previewHeadline }}</p>
        <p class="profile-modal__hero-email" :title="email">{{ email }}</p>
      </div>
    </header>

    <nav class="profile-modal__tabs" role="tablist" aria-label="Seções do perfil">
      <button
        class="profile-modal__tab"
        type="button"
        role="tab"
        :aria-selected="activeTab === 'account'"
        :class="{ 'profile-modal__tab--active': activeTab === 'account' }"
        @click="setTab('account')"
      >
        Conta
      </button>
      <button
        class="profile-modal__tab"
        type="button"
        role="tab"
        :aria-selected="activeTab === 'preferences'"
        :class="{ 'profile-modal__tab--active': activeTab === 'preferences' }"
        @click="setTab('preferences')"
      >
        Preferências
      </button>
    </nav>

    <section v-if="activeTab === 'account'" class="profile-modal__panel" role="tabpanel">
      <dl class="profile-modal__fields">
        <div class="profile-modal__row">
          <dt>Nome</dt>
          <dd>{{ displayName }}</dd>
        </div>

        <div class="profile-modal__row">
          <dt>E-mail</dt>
          <dd>{{ email }}</dd>
        </div>

        <div class="profile-modal__row">
          <dt>ID do usuário</dt>
          <dd class="profile-modal__mono">{{ userId }}</dd>
        </div>

        <div class="profile-modal__row">
          <dt>Status</dt>
          <dd>
            <span
              class="profile-modal__status"
              :class="`profile-modal__status--${accountStatusTone}`"
            >
              {{ accountStatusLabel }}
            </span>
          </dd>
        </div>

        <div class="profile-modal__row">
          <dt>Departamento</dt>
          <dd>{{ preferences.department || "—" }}</dd>
        </div>

        <div class="profile-modal__row">
          <dt>Modo de trabalho</dt>
          <dd>{{ currentWorkModeLabel }}</dd>
        </div>

        <div class="profile-modal__row">
          <dt>Conta criada em</dt>
          <dd>{{ accountCreated }}</dd>
        </div>

        <div class="profile-modal__row">
          <dt>Último login</dt>
          <dd>{{ lastLogin }}</dd>
        </div>

        <div v-if="selectedInterestLabels.length" class="profile-modal__row">
          <dt>Interesses</dt>
          <dd>
            <span
              v-for="interest in selectedInterestLabels"
              :key="interest"
              class="profile-modal__badge"
              >{{ interest }}</span
            >
          </dd>
        </div>

        <div v-if="preferences.bio" class="profile-modal__row">
          <dt>Sobre você</dt>
          <dd class="profile-modal__bio">{{ preferences.bio }}</dd>
        </div>

        <div v-if="roles.length" class="profile-modal__row">
          <dt>Papéis</dt>
          <dd>
            <span v-for="role in roles" :key="role" class="profile-modal__badge">
              {{ role }}
            </span>
          </dd>
        </div>

        <div v-if="permissions.length" class="profile-modal__row">
          <dt>Permissões</dt>
          <dd class="profile-modal__perms">
            <span v-for="permission in permissions" :key="permission" class="profile-modal__perm">
              {{ permission }}
            </span>
          </dd>
        </div>
      </dl>

      <footer class="profile-modal__footer">
        <div class="profile-modal__actions">
          <button class="btn btn-outline" type="button" @click="triggerPhotoUpload">
            Trocar foto
          </button>
          <button class="btn btn-outline" type="button" @click="openChangeEmail">
            Alterar e-mail
          </button>
          <button class="btn btn-outline" type="button" @click="openChangePassword">
            Alterar senha
          </button>
        </div>

        <button class="btn btn-primary" type="button" @click="setTab('preferences')">
          Personalizar perfil
        </button>
      </footer>
    </section>

    <form
      v-else
      class="profile-modal__panel profile-modal__preferences"
      @submit.prevent="savePreferences"
    >
      <div class="profile-modal__form-grid">
        <label class="profile-modal__field">
          <span class="profile-modal__label">Nome de exibição</span>
          <input
            v-model="preferences.preferredName"
            class="profile-modal__input"
            type="text"
            maxlength="48"
            placeholder="Como você quer aparecer no topo"
          />
        </label>

        <label class="profile-modal__field">
          <span class="profile-modal__label">Cargo / função</span>
          <input
            v-model="preferences.headline"
            class="profile-modal__input"
            type="text"
            maxlength="72"
            placeholder="Ex.: Coordenador de Operações"
          />
        </label>

        <label class="profile-modal__field">
          <span class="profile-modal__label">Departamento</span>
          <select v-model="preferences.department" class="profile-modal__input">
            <option
              v-for="department in PROFILE_DEPARTMENT_OPTIONS"
              :key="department"
              :value="department"
            >
              {{ department }}
            </option>
          </select>
        </label>

        <label class="profile-modal__field">
          <span class="profile-modal__label">Pronomes</span>
          <input
            v-model="preferences.pronouns"
            class="profile-modal__input"
            type="text"
            maxlength="32"
            placeholder="Ex.: ela/dela"
          />
        </label>

        <label class="profile-modal__field profile-modal__field--full">
          <span class="profile-modal__label">Sobre você</span>
          <textarea
            v-model="preferences.bio"
            class="profile-modal__input profile-modal__textarea"
            maxlength="280"
            rows="4"
            placeholder="Conte rapidamente sua especialidade, objetivos e estilo de atuação."
          ></textarea>
          <small class="profile-modal__hint">
            {{ bioRemaining }} caractere(s) restantes
          </small>
        </label>
      </div>

      <section class="profile-modal__section">
        <header class="profile-modal__section-head">
          <h4>Modo de trabalho</h4>
          <p>Selecione o formato que melhor representa sua rotina.</p>
        </header>

        <div class="profile-modal__mode-grid">
          <button
            v-for="mode in PROFILE_WORK_MODE_OPTIONS"
            :key="mode.value"
            class="profile-modal__choice"
            type="button"
            :class="{ 'profile-modal__choice--active': preferences.workMode === mode.value }"
            @click="setWorkMode(mode.value)"
          >
            <strong>{{ mode.label }}</strong>
            <span>{{ mode.description }}</span>
          </button>
        </div>
      </section>

      <section class="profile-modal__section">
        <header class="profile-modal__section-head">
          <h4>Interesses</h4>
          <p>
            Selecione até {{ PROFILE_INTERESTS_MAX }} tópicos que você quer priorizar.
          </p>
        </header>

        <div class="profile-modal__chip-grid">
          <button
            v-for="interest in PROFILE_INTEREST_OPTIONS"
            :key="interest.value"
            class="profile-modal__chip"
            type="button"
            :class="{
              'profile-modal__chip--active':
                preferences.interests.includes(interest.value),
            }"
            @click="toggleInterest(interest.value)"
          >
            {{ interest.label }}
          </button>
        </div>

        <small class="profile-modal__hint">
          {{ selectedInterestCount }}/{{ PROFILE_INTERESTS_MAX }} selecionados
        </small>
      </section>

      <section class="profile-modal__section">
        <header class="profile-modal__section-head">
          <h4>Preferências de dashboard</h4>
          <p>Ative os comportamentos que fazem sentido para sua rotina.</p>
        </header>

        <div class="profile-modal__toggle-list">
          <label
            v-for="toggle in dashboardToggleOptions"
            :key="toggle.key"
            class="profile-modal__toggle"
          >
            <span class="profile-modal__toggle-copy">
              <strong>{{ toggle.label }}</strong>
              <small>{{ toggle.description }}</small>
            </span>
            <input
              v-model="preferences.dashboard[toggle.key]"
              type="checkbox"
              class="profile-modal__toggle-input"
            />
          </label>
        </div>
      </section>

      <section class="profile-modal__section">
        <header class="profile-modal__section-head">
          <h4>Preferências de comunicação</h4>
          <p>Defina como você prefere receber mensagens no sistema.</p>
        </header>

        <div class="profile-modal__toggle-list">
          <label
            v-for="toggle in communicationToggleOptions"
            :key="toggle.key"
            class="profile-modal__toggle"
          >
            <span class="profile-modal__toggle-copy">
              <strong>{{ toggle.label }}</strong>
              <small>{{ toggle.description }}</small>
            </span>
            <input
              v-model="preferences.communication[toggle.key]"
              type="checkbox"
              class="profile-modal__toggle-input"
            />
          </label>
        </div>
      </section>

      <footer class="profile-modal__footer">
        <div class="profile-modal__actions">
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="!isDirty || isSaving"
            @click="discardPreferenceDraft"
          >
            Descartar mudanças
          </button>
          <button
            class="btn btn-outline"
            type="button"
            :disabled="isSaving"
            @click="restoreDefaultPreferences"
          >
            Restaurar padrão
          </button>
        </div>

        <button class="btn btn-primary" type="submit" :disabled="!isDirty || isSaving">
          {{ isSaving ? "Salvando..." : "Salvar perfil" }}
        </button>
      </footer>
    </form>
  </div>
</template>

<style scoped lang="scss">
.profile-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0 0.25rem;
}

.profile-modal__hero {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.profile-modal__hero-copy {
  min-width: 0;
}

.profile-modal__hero-name {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-1);
}

.profile-modal__hero-headline {
  margin: 0.125rem 0 0;
  font-size: 0.875rem;
  color: var(--text-2);
}

.profile-modal__hero-email {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-modal__avatar-wrap {
  position: relative;
  cursor: pointer;
  border-radius: var(--radius-full, 9999px);
  transition: transform 140ms ease;

  &:hover {
    transform: scale(1.04);

    .profile-modal__avatar-overlay {
      opacity: 1;
    }
  }
}

.profile-modal__avatar {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--primary-fg, #fff);
  background: var(--primary);
  border-radius: var(--radius-full, 9999px);

  &--image {
    overflow: hidden;
    background: transparent;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.profile-modal__avatar-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full, 9999px);
  color: #fff;
  background: rgba(0, 0, 0, 0.48);
  opacity: 0;
  transition: opacity 150ms ease;
}

.profile-modal__tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.profile-modal__tab {
  border: 1px solid var(--border-1);
  background: var(--surface-2);
  color: var(--text-2);
  border-radius: var(--radius-md, 12px);
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    color 120ms ease,
    background-color 120ms ease;

  &--active {
    border-color: color-mix(in oklab, var(--primary) 40%, var(--border-1));
    color: var(--primary);
    background: color-mix(in oklab, var(--primary) 12%, var(--surface-2));
  }
}

.profile-modal__panel {
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg, 16px);
  background: var(--surface-1);
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-modal__fields {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin: 0;
}

.profile-modal__row {
  display: flex;
  flex-direction: column;
  gap: 0.14rem;

  dt {
    font-size: 0.66rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--text-muted);
  }

  dd {
    margin: 0;
    color: var(--text-1);
    display: flex;
    flex-wrap: wrap;
    gap: 0.38rem;
    font-size: 0.92rem;
  }
}

.profile-modal__bio {
  line-height: 1.45;
}

.profile-modal__badge {
  display: inline-flex;
  padding: 0.11rem 0.48rem;
  border-radius: var(--radius-full, 9999px);
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--primary);
  background: color-mix(in oklab, var(--primary) 16%, transparent);
}

.profile-modal__mono {
  font-family: var(--font-mono, monospace);
  color: var(--text-2);
}

.profile-modal__status {
  display: inline-flex;
  border-radius: var(--radius-full, 9999px);
  padding: 0.13rem 0.53rem;
  font-size: 0.74rem;
  font-weight: 700;

  &--active {
    color: var(--success, #15803d);
    background: color-mix(in oklab, var(--success) 16%, transparent);
  }

  &--disabled,
  &--locked {
    color: var(--danger, #b91c1c);
    background: color-mix(in oklab, var(--danger) 16%, transparent);
  }
}

.profile-modal__perms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-height: 7rem;
  overflow-y: auto;
}

.profile-modal__perm {
  display: inline-flex;
  border-radius: var(--radius-sm, 6px);
  padding: 0.08rem 0.36rem;
  font-size: 0.68rem;
  font-family: var(--font-mono, monospace);
  color: var(--text-2);
  background: var(--surface-2);
}

.profile-modal__preferences {
  gap: 0.9rem;
}

.profile-modal__form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.62rem;
}

.profile-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.33rem;

  &--full {
    grid-column: 1 / -1;
  }
}

.profile-modal__label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  color: var(--text-muted);
}

.profile-modal__input {
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 10px);
  background: var(--surface-2);
  color: var(--text-1);
  padding: 0.55rem 0.6rem;
  font-size: 0.88rem;

  &:focus {
    outline: none;
    border-color: color-mix(in oklab, var(--primary) 45%, var(--border-1));
    box-shadow: 0 0 0 2px
      color-mix(in oklab, var(--primary) 22%, transparent);
  }
}

.profile-modal__textarea {
  min-height: 4.6rem;
  resize: vertical;
}

.profile-modal__section {
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 12px);
  background: var(--surface-2);
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.58rem;
}

.profile-modal__section-head {
  h4 {
    margin: 0;
    font-size: 0.87rem;
    color: var(--text-1);
  }

  p {
    margin: 0.2rem 0 0;
    color: var(--text-muted);
    font-size: 0.75rem;
    line-height: 1.35;
  }
}

.profile-modal__mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.profile-modal__choice {
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 10px);
  background: var(--surface-1);
  color: var(--text-2);
  padding: 0.48rem 0.52rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;

  strong {
    font-size: 0.8rem;
    color: var(--text-1);
  }

  span {
    font-size: 0.72rem;
    line-height: 1.3;
  }

  &--active {
    border-color: color-mix(in oklab, var(--primary) 45%, var(--border-1));
    background: color-mix(in oklab, var(--primary) 12%, var(--surface-1));
  }
}

.profile-modal__chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.profile-modal__chip {
  border: 1px solid var(--border-1);
  border-radius: var(--radius-full, 9999px);
  background: var(--surface-1);
  color: var(--text-2);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.32rem 0.6rem;
  cursor: pointer;

  &--active {
    color: var(--primary);
    border-color: color-mix(in oklab, var(--primary) 45%, var(--border-1));
    background: color-mix(in oklab, var(--primary) 14%, var(--surface-1));
  }
}

.profile-modal__toggle-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.profile-modal__toggle {
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 10px);
  background: var(--surface-1);
  padding: 0.48rem 0.58rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.profile-modal__toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;

  strong {
    color: var(--text-1);
    font-size: 0.8rem;
    font-weight: 600;
  }

  small {
    color: var(--text-muted);
    font-size: 0.72rem;
    line-height: 1.3;
  }
}

.profile-modal__toggle-input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--primary);
  flex: 0 0 auto;
}

.profile-modal__hint {
  color: var(--text-muted);
  font-size: 0.72rem;
}

.profile-modal__footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  padding-top: 0.25rem;
}

.profile-modal__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .profile-modal__hero {
    align-items: flex-start;
  }

  .profile-modal__form-grid {
    grid-template-columns: 1fr;
  }

  .profile-modal__mode-grid {
    grid-template-columns: 1fr;
  }

  .profile-modal__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .profile-modal__actions {
    width: 100%;

    .btn {
      flex: 1;
      min-width: 0;
    }
  }
}
</style>
