<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from "vue";
import ApiClientService from "../../services/ApiClientService";
import AlertService from "../../services/AlertService";

const emit = defineEmits<{
  (e: "close"): void;
  (e: "invited", email: string): void;
}>();

const form = reactive({ email: "", role: "member" });
const sending = ref(false);
const sent = ref(false);
const error = ref("");
const currentUserRole = ref("");

// Role hierarchy: higher index = higher privilege
const ROLE_HIERARCHY = ["viewer", "member", "manager", "admin"] as const;

const roleLevel = (r: string) =>
  ROLE_HIERARCHY.indexOf(r as (typeof ROLE_HIERARCHY)[number]);

// Fetch current user's role on mount
onMounted(async () => {
  try {
    const me = await ApiClientService.auth.me();
    currentUserRole.value = me?.roleKey || me?.role || "";
  } catch {
    currentUserRole.value = "";
  }
});

// Roles the current user can assign (only up to their own level)
const allowedRoles = computed(() => {
  const myLevel = roleLevel(currentUserRole.value);
  return ROLE_HIERARCHY.filter((_, i) => i <= myLevel);
});

const roleBlocked = computed(() => {
  const myLevel = roleLevel(currentUserRole.value);
  const targetLevel = roleLevel(form.role);
  return targetLevel > myLevel;
});

function validate(): boolean {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) {
    error.value = "E-mail é obrigatório.";
    return false;
  }
  if (!emailRe.test(form.email.trim())) {
    error.value = "Informe um endereço de e-mail válido.";
    return false;
  }
  if (roleBlocked.value) {
    error.value =
      "Você não pode convidar um usuário com privilégio superior ao seu.";
    return false;
  }
  error.value = "";
  return true;
}

async function submit() {
  if (!validate()) return;
  sending.value = true;
  try {
    await ApiClientService.raw.post("/admin/users", {
      email: form.email.trim().toLowerCase(),
      roleKey: form.role,
    });
    sent.value = true;
    emit("invited", form.email.trim());
  } catch (e: any) {
    const msg =
      e?.response?.data?.message || "Falha ao enviar convite. Tente novamente.";
    error.value = msg;
  } finally {
    sending.value = false;
  }
}

function reset() {
  form.email = "";
  form.role = "member";
  sent.value = false;
  error.value = "";
}

watch(
  () => form.email,
  () => {
    if (error.value) error.value = "";
  },
);

watch(
  () => form.role,
  () => {
    if (roleBlocked.value) {
      error.value =
        "Você não pode convidar um usuário com privilégio superior ao seu.";
    } else if (error.value.includes("privilégio")) {
      error.value = "";
    }
  },
);
</script>

<template>
  <div class="invite-modal">
    <template v-if="!sent">
      <h2 class="invite-modal__title">Convidar Membro da Equipe</h2>
      <p class="invite-modal__desc">Envie um link de convite por e-mail.</p>

      <form class="invite-modal__form" novalidate @submit.prevent="submit">
        <label class="invite-modal__field">
          <span class="invite-modal__label">Endereço de E-mail</span>
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="colega@empresa.com"
            class="invite-modal__input"
            :disabled="sending"
            required
          />
        </label>

        <label class="invite-modal__field">
          <span class="invite-modal__label">Papel</span>
          <select
            v-model="form.role"
            class="invite-modal__select"
            :disabled="sending"
          >
            <option v-for="r in allowedRoles" :key="r" :value="r">
              {{
                r === "viewer"
                  ? "Visualizador"
                  : r === "member"
                    ? "Membro"
                    : r === "manager"
                      ? "Gerente"
                      : "Administrador"
              }}
            </option>
          </select>
          <small v-if="roleBlocked" class="invite-modal__error">
            Privilégio superior ao seu papel atual ({{ currentUserRole }}).
          </small>
        </label>

        <p v-if="error" class="invite-modal__error">{{ error }}</p>

        <div class="invite-modal__actions">
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="sending"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="sending || roleBlocked"
          >
            {{ sending ? "Enviando…" : "Enviar Convite" }}
          </button>
        </div>
      </form>
    </template>

    <template v-else>
      <div class="invite-modal__success">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="invite-modal__check-icon"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="9,12 11.5,14.5 15.5,9.5" />
        </svg>
        <h2 class="invite-modal__title">Convite Enviado!</h2>
        <p class="invite-modal__desc">
          Um convite foi enviado para <strong>{{ form.email }}</strong> com o
          papel de
          <strong>{{
            form.role === "viewer"
              ? "Visualizador"
              : form.role === "member"
                ? "Membro"
                : form.role === "manager"
                  ? "Gerente"
                  : "Administrador"
          }}</strong
          >.
        </p>
        <div class="invite-modal__actions">
          <button class="btn btn-ghost" type="button" @click="emit('close')">
            Fechar
          </button>
          <button class="btn btn-primary" type="button" @click="reset">
            Convidar Outro
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.invite-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 420px;
  width: 100%;
}

.invite-modal__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-1);
}

.invite-modal__desc {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-muted);
}

.invite-modal__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.invite-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.invite-modal__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-2);
}

.invite-modal__input,
.invite-modal__select {
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 10px);
  background: var(--surface-1);
  color: var(--text-1);
  outline: none;
  transition: border-color 150ms ease;

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-alpha, rgba(59, 130, 246, 0.18));
  }
}

.invite-modal__error {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--danger, #ef4444);
  font-weight: 600;
}

.invite-modal__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.invite-modal__success {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: 1rem 0;
}

.invite-modal__check-icon {
  width: 3rem;
  height: 3rem;
  color: var(--success, #16a34a);
}
</style>
