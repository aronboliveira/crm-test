<script setup lang="ts">
import { ref, reactive, watch } from "vue";

const emit = defineEmits<{
  (e: "close"): void;
  (e: "invited", email: string): void;
}>();

const form = reactive({ email: "", role: "member" });
const sending = ref(false);
const sent = ref(false);
const error = ref("");

function validate(): boolean {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) {
    error.value = "Email is required.";
    return false;
  }
  if (!emailRe.test(form.email.trim())) {
    error.value = "Enter a valid email address.";
    return false;
  }
  error.value = "";
  return true;
}

async function submit() {
  if (!validate()) return;
  sending.value = true;
  try {
    /* simulate API call */
    await new Promise((r) => setTimeout(r, 900));
    sent.value = true;
    emit("invited", form.email.trim());
  } catch {
    error.value = "Failed to send invitation. Try again.";
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
</script>

<template>
  <div class="invite-modal">
    <template v-if="!sent">
      <h2 class="invite-modal__title">Invite a Team Member</h2>
      <p class="invite-modal__desc">Send an invitation link via email.</p>

      <form class="invite-modal__form" @submit.prevent="submit">
        <label class="invite-modal__field">
          <span class="invite-modal__label">Email Address</span>
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="colleague@company.com"
            class="invite-modal__input"
            :disabled="sending"
            required
          />
        </label>

        <label class="invite-modal__field">
          <span class="invite-modal__label">Role</span>
          <select
            v-model="form.role"
            class="invite-modal__select"
            :disabled="sending"
          >
            <option value="viewer">Viewer</option>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <p v-if="error" class="invite-modal__error">{{ error }}</p>

        <div class="invite-modal__actions">
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="sending"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button class="btn btn-primary" type="submit" :disabled="sending">
            {{ sending ? "Sending…" : "Send Invitation" }}
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
        <h2 class="invite-modal__title">Invitation Sent!</h2>
        <p class="invite-modal__desc">
          An invite has been sent to <strong>{{ form.email }}</strong> with the
          <strong>{{ form.role }}</strong> role.
        </p>
        <div class="invite-modal__actions">
          <button class="btn btn-ghost" type="button" @click="emit('close')">
            Close
          </button>
          <button class="btn btn-primary" type="button" @click="reset">
            Invite Another
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
