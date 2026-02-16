<script setup lang="ts">
import { onMounted } from "vue";
import { useUserProfilePage } from "../assets/scripts/pages/useUserProfilePage";

const {
  profile,
  profileForm,
  preferences,
  passwordForm,
  isLoading,
  isSavingProfile,
  isSavingPreferences,
  isChangingPassword,
  isExportingData,
  isDeletingAccount,
  isTwoFactorBusy,
  isUploadingAvatar,
  isEditMode,
  errorMessage,
  successMessage,
  displayName,
  initials,
  hasAvatar,
  themeMode,
  twoFactorEnabled,
  twoFactorSetupSecret,
  twoFactorSetupOtpauthUrl,
  twoFactorSetupCode,
  twoFactorDisableCode,
  twoFactorRecoveryCodes,
  deleteAccountPassword,
  loadProfile,
  uploadAvatar,
  enterEditMode,
  cancelEditMode,
  saveProfile,
  savePreferences,
  changePassword,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  exportMyData,
  deleteMyAccount,
} = useUserProfilePage();

const handleAvatarChange = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  await uploadAvatar(file);
  input.value = "";
};

onMounted(async () => {
  await loadProfile();
});
</script>

<template>
  <main class="user-profile-page" aria-label="Perfil do Usuário">
    <section class="profile-card">
      <header class="profile-header">
        <h1>Meu Perfil</h1>
        <p>Edite seus dados, tema e senha.</p>
      </header>

      <p v-if="errorMessage" class="profile-error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="profile-success">{{ successMessage }}</p>

      <div v-if="isLoading" class="profile-loading">Carregando perfil...</div>

      <template v-else-if="profile">
        <div class="profile-avatar-section">
          <div v-if="hasAvatar" class="avatar-image-wrapper">
            <img
              :src="profile.avatarUrl"
              :alt="`Avatar de ${displayName}`"
              class="avatar-image"
            />
          </div>
          <div v-else class="avatar-fallback" aria-hidden="true">
            {{ initials }}
          </div>

          <label class="avatar-upload-btn">
            {{ isUploadingAvatar ? "Enviando..." : "Alterar avatar" }}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              :disabled="isUploadingAvatar"
              @change="handleAvatarChange"
            />
          </label>
        </div>

        <section class="profile-section">
          <div class="section-header">
            <h2>Dados básicos</h2>
            <div class="section-actions">
              <button
                v-if="!isEditMode"
                type="button"
                class="btn-secondary"
                @click="enterEditMode"
              >
                Editar
              </button>
              <template v-else>
                <button
                  type="button"
                  class="btn-secondary"
                  @click="cancelEditMode"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="isSavingProfile"
                  @click="saveProfile"
                >
                  {{ isSavingProfile ? "Salvando..." : "Salvar" }}
                </button>
              </template>
            </div>
          </div>

          <dl v-if="!isEditMode" class="profile-grid">
            <div>
              <dt>Nome</dt>
              <dd>{{ displayName }}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{{ profile.email || "-" }}</dd>
            </div>
            <div>
              <dt>Usuário</dt>
              <dd>{{ profile.username || "-" }}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{{ profile.phone || "-" }}</dd>
            </div>
            <div>
              <dt>Departamento</dt>
              <dd>{{ profile.department || "-" }}</dd>
            </div>
            <div>
              <dt>Cargo</dt>
              <dd>{{ profile.jobTitle || "-" }}</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{{ profile.timezone || "-" }}</dd>
            </div>
            <div>
              <dt>Locale</dt>
              <dd>{{ profile.locale || "-" }}</dd>
            </div>
          </dl>

          <div v-else class="profile-form-grid">
            <label>
              <span>Nome</span>
              <input v-model="profileForm.firstName" type="text" />
            </label>
            <label>
              <span>Sobrenome</span>
              <input v-model="profileForm.lastName" type="text" />
            </label>
            <label>
              <span>Telefone</span>
              <input v-model="profileForm.phone" type="text" />
            </label>
            <label>
              <span>Departamento</span>
              <input v-model="profileForm.department" type="text" />
            </label>
            <label>
              <span>Cargo</span>
              <input v-model="profileForm.jobTitle" type="text" />
            </label>
            <label>
              <span>Timezone</span>
              <input
                v-model="profileForm.timezone"
                type="text"
                placeholder="America/Sao_Paulo"
              />
            </label>
            <label>
              <span>Locale</span>
              <input
                v-model="profileForm.locale"
                type="text"
                placeholder="pt-BR"
              />
            </label>
            <label class="full-width">
              <span>Bio</span>
              <textarea v-model="profileForm.bio" rows="4" />
            </label>
          </div>
        </section>

        <section class="profile-section">
          <div class="section-header">
            <h2>Preferências</h2>
            <button
              type="button"
              class="btn-primary"
              :disabled="isSavingPreferences"
              @click="savePreferences"
            >
              {{ isSavingPreferences ? "Salvando..." : "Salvar preferências" }}
            </button>
          </div>

          <label class="theme-field">
            <span>Modo de tema</span>
            <select v-model="themeMode">
              <option value="system">Sistema</option>
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </label>

          <p class="profile-help">Tema atual salvo: {{ preferences.theme }}</p>

          <div class="profile-form-grid preferences-grid">
            <label class="switch-field">
              <input
                v-model="preferences.notifications.email"
                type="checkbox"
              />
              <span>E-mail</span>
            </label>
            <label class="switch-field">
              <input
                v-model="preferences.notifications.browser"
                type="checkbox"
              />
              <span>Navegador</span>
            </label>
            <label class="switch-field">
              <input
                v-model="preferences.notifications.taskDue"
                type="checkbox"
              />
              <span>Tarefas vencendo</span>
            </label>
            <label class="switch-field">
              <input
                v-model="preferences.notifications.mentions"
                type="checkbox"
              />
              <span>Menções</span>
            </label>
            <label class="switch-field">
              <input
                v-model="preferences.notifications.security"
                type="checkbox"
              />
              <span>Alertas de segurança</span>
            </label>
            <label class="switch-field">
              <input
                v-model="preferences.notifications.product"
                type="checkbox"
              />
              <span>Novidades do produto</span>
            </label>
          </div>
        </section>

        <section class="profile-section">
          <div class="section-header">
            <h2>Alterar senha</h2>
            <button
              type="button"
              class="btn-primary"
              :disabled="isChangingPassword"
              @click="changePassword"
            >
              {{ isChangingPassword ? "Atualizando..." : "Atualizar senha" }}
            </button>
          </div>

          <div class="profile-form-grid">
            <label>
              <span>Senha atual</span>
              <input
                v-model="passwordForm.currentPassword"
                type="password"
                autocomplete="current-password"
              />
            </label>
            <label>
              <span>Nova senha</span>
              <input
                v-model="passwordForm.newPassword"
                type="password"
                autocomplete="new-password"
              />
            </label>
            <label>
              <span>Confirmar nova senha</span>
              <input
                v-model="passwordForm.confirmPassword"
                type="password"
                autocomplete="new-password"
              />
            </label>
          </div>
        </section>

        <section class="profile-section">
          <div class="section-header">
            <h2>Autenticação de dois fatores (2FA)</h2>
          </div>

          <p class="profile-help">
            Status atual:
            <strong>{{ twoFactorEnabled ? "Ativado" : "Desativado" }}</strong>
          </p>

          <div v-if="!twoFactorEnabled" class="profile-form-grid">
            <div class="full-width">
              <button
                type="button"
                class="btn-secondary"
                :disabled="isTwoFactorBusy"
                @click="setupTwoFactor"
              >
                {{ isTwoFactorBusy ? "Gerando..." : "Gerar chave 2FA" }}
              </button>
            </div>

            <label v-if="twoFactorSetupSecret" class="full-width">
              <span>Chave secreta (copiar no app autenticador)</span>
              <input :value="twoFactorSetupSecret" type="text" readonly />
            </label>

            <p v-if="twoFactorSetupOtpauthUrl" class="profile-help full-width">
              URL OTPAUTH gerada. Você pode usar a chave acima no Google
              Authenticator, 1Password, Authy etc.
            </p>

            <label>
              <span>Código de confirmação (6 dígitos)</span>
              <input
                v-model="twoFactorSetupCode"
                type="text"
                placeholder="123456"
                autocomplete="one-time-code"
              />
            </label>

            <div>
              <button
                type="button"
                class="btn-primary"
                :disabled="isTwoFactorBusy"
                @click="enableTwoFactor"
              >
                {{ isTwoFactorBusy ? "Ativando..." : "Ativar 2FA" }}
              </button>
            </div>
          </div>

          <div v-else class="profile-form-grid">
            <label>
              <span>Código 2FA ou recovery code</span>
              <input
                v-model="twoFactorDisableCode"
                type="text"
                placeholder="123456 ou ABCD1234"
              />
            </label>
            <div>
              <button
                type="button"
                class="btn-secondary"
                :disabled="isTwoFactorBusy"
                @click="disableTwoFactor"
              >
                {{ isTwoFactorBusy ? "Desativando..." : "Desativar 2FA" }}
              </button>
            </div>

            <div v-if="twoFactorRecoveryCodes.length" class="full-width">
              <p class="profile-help">
                Guarde estes recovery codes em local seguro:
              </p>
              <ul class="recovery-codes">
                <li v-for="code in twoFactorRecoveryCodes" :key="code">
                  {{ code }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="profile-section">
          <div class="section-header">
            <h2>Privacidade</h2>
          </div>

          <div class="section-actions">
            <button
              type="button"
              class="btn-secondary"
              :disabled="isExportingData"
              @click="exportMyData"
            >
              {{ isExportingData ? "Exportando..." : "Exportar meus dados" }}
            </button>
          </div>

          <div class="profile-form-grid">
            <label>
              <span>Senha para excluir conta</span>
              <input
                v-model="deleteAccountPassword"
                type="password"
                autocomplete="current-password"
                placeholder="Digite sua senha"
              />
            </label>
            <div>
              <button
                type="button"
                class="btn-danger"
                :disabled="isDeletingAccount"
                @click="deleteMyAccount"
              >
                {{ isDeletingAccount ? "Excluindo..." : "Excluir minha conta" }}
              </button>
            </div>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.user-profile-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-card {
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
}

.profile-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.profile-header p {
  margin: 0.4rem 0 0;
  color: var(--text-muted);
}

.profile-error {
  color: var(--danger-color);
  margin-top: 1rem;
}

.profile-success {
  color: var(--success-color);
  margin-top: 1rem;
}

.profile-loading {
  margin-top: 1rem;
  color: var(--text-muted);
}

.profile-avatar-section {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-image-wrapper,
.avatar-fallback {
  width: 72px;
  height: 72px;
  border-radius: 9999px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  background: var(--surface-muted);
  color: var(--text-color);
  font-weight: 700;
}

.avatar-upload-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  background: var(--primary-color);
  color: var(--on-primary-color);
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
  font-size: 0.9rem;
}

.profile-section {
  margin-top: 1.2rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1rem;
}

.section-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  border: none;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary-color);
  color: var(--on-primary-color);
}

.btn-secondary {
  background: var(--surface-muted);
  color: var(--text-color);
}

.btn-danger {
  background: var(--danger-color);
  color: var(--on-primary-color);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.profile-form-grid {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.85rem;
}

.profile-form-grid label,
.theme-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.profile-form-grid label span,
.theme-field span {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.profile-form-grid input,
.profile-form-grid textarea,
.theme-field select {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-color);
  padding: 0.55rem 0.65rem;
}

.full-width {
  grid-column: 1 / -1;
}

.theme-field {
  margin-top: 0.9rem;
  max-width: 280px;
}

.profile-help {
  margin: 0.6rem 0 0;
  color: var(--text-muted);
  font-size: 0.86rem;
}

.preferences-grid {
  margin-top: 1rem;
}

.switch-field {
  display: inline-flex;
  flex-direction: row !important;
  align-items: center;
  gap: 0.55rem;
}

.switch-field input {
  width: 16px;
  height: 16px;
}

.recovery-codes {
  margin: 0.5rem 0 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.25rem;
}

.avatar-upload-btn input {
  display: none;
}

.profile-grid {
  margin-top: 1.25rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.9rem;
}

.profile-grid dt {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--text-muted);
}

.profile-grid dd {
  margin: 0.2rem 0 0;
  font-weight: 500;
}

.profile-bio {
  margin-top: 1rem;
}

.profile-bio h2 {
  margin: 0 0 0.4rem;
  font-size: 1rem;
}

.profile-bio p {
  margin: 0;
  color: var(--text-color);
}
</style>
