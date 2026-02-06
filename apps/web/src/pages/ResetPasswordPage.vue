<script setup lang="ts">
import { useResetPasswordPage } from "../assets/scripts/pages/useResetPasswordPage";
const {
  FORM_ID,
  token,
  password,
  confirm,
  busy,
  tokenOk,
  passOk,
  sameOk,
  canSubmit,
  pasteToken,
  submit,
} = useResetPasswordPage();
</script>

<template>
  <section class="rp-page" aria-label="Reset password page">
    <div class="rp-card card">
      <header class="rp-head">
        <h1 class="text-xl font-black">Reset password</h1>
        <p class="opacity-70" :id="`${FORM_ID}__help`">
          Provide the token (from invite/outbox) and set a new password.
        </p>
      </header>

      <form
        ref="formRef"
        class="rp-body"
        :id="FORM_ID"
        @submit.prevent="submit"
      >
        <label class="grid gap-1">
          <span class="font-semibold">Token</span>

          <div class="flex gap-2 items-center">
            <input
              class="table-search-input flex-1"
              v-model="token"
              name="token"
              autocomplete="off"
              aria-required="true"
              :aria-invalid="!tokenOk"
              placeholder="paste token here"
            />

            <button
              class="btn btn-ghost"
              type="button"
              aria-label="Paste token"
              @click="pasteToken"
            >
              Paste
            </button>
          </div>

          <small class="opacity-70" v-if="token && !tokenOk"
            >Token format invalid.</small
          >
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">New password</span>
          <input
            class="table-search-input"
            v-model="password"
            name="password"
            type="password"
            aria-required="true"
            :aria-invalid="!passOk && !!password"
            placeholder="min 10 chars"
          />
          <small class="opacity-70" v-if="password && !passOk"
            >Minimum 10 characters.</small
          >
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">Confirm password</span>
          <input
            class="table-search-input"
            v-model="confirm"
            name="confirm"
            type="password"
            aria-required="true"
            :aria-invalid="!sameOk && !!confirm"
            placeholder="repeat password"
          />
          <small class="opacity-70" v-if="confirm && !sameOk"
            >Passwords do not match.</small
          >
        </label>

        <div class="flex justify-end gap-2 pt-1">
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="!canSubmit"
            :aria-disabled="!canSubmit"
          >
            {{ busy ? "Saving..." : "Save" }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style lang="scss">
@keyframes rpIn {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.rp-body {
  display: grid;
  gap: 0.9rem;
  padding: 0.95rem;

  input::placeholder {
    opacity: 0.75;
  }
  input:focus {
    outline: 2px solid rgba(120, 120, 200, 0.35);
    outline-offset: 2px;
  }
  input:invalid {
    box-shadow: 0 0 0 2px rgba(220, 80, 80, 0.22);
  }
  input:valid {
    box-shadow: 0 0 0 2px rgba(80, 160, 120, 0.16);
  }

  ::selection {
    background: rgba(120, 120, 200, 0.22);
  }
}

.rp-card {
  animation: rpIn 160ms ease both;
  container-type: inline-size;
  width: min(720px, 94vw);

  &:hover {
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.14);
  }
  &:active {
    transform: translateY(1px);
  }
}

.rp-head {
  border-bottom: 1px solid rgba(120, 120, 140, 0.22);
  display: grid;
  gap: 0.25rem;
  padding: 0.95rem;
}

.rp-page {
  display: grid;
  min-height: calc(100vh - 2rem);
  padding: 1rem;
  place-items: center;
}

@container (max-width: 520px) {
  .rp-body {
    padding: 0.75rem;
  }
  .rp-head {
    padding: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rp-card {
    animation: none;
  }
}

@starting-style {
  .rp-card {
    opacity: 0;
    transform: translateY(8px);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
