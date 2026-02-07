<script setup lang="ts">
import { computed, ref, defineAsyncComponent } from "vue";
import { useAuthStore } from "../../pinia/stores/auth.store";
import { usePolicyStore } from "../../pinia/stores/policy.store";
import ModalService from "../../services/ModalService";
import AlertService from "../../services/AlertService";

const ChangeEmailModal = defineAsyncComponent(
  () => import("../auth/ChangeEmailModal.vue"),
);
const ChangePasswordModal = defineAsyncComponent(
  () => import("../auth/ChangePasswordModal.vue"),
);

const emit = defineEmits<{
  (e: "close"): void;
}>();

const auth = useAuthStore();
const policy = usePolicyStore();

const me = computed(() => auth.me);
const email = computed(() => me.value?.email ?? "—");
const displayName = computed(() => {
  const u = me.value;
  if (u && "name" in u && u.name) return String(u.name);
  const e = email.value;
  if (e && e !== "—") {
    const part = e.split("@")[0];
    if (part) return part.charAt(0).toUpperCase() + part.slice(1);
  }
  return "User";
});

const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2),
);

const roles = computed<string[]>(() => {
  const u = me.value as any;
  return Array.isArray(u?.roles) ? u.roles : [];
});

const permissions = computed<string[]>(() =>
  Array.isArray(policy.perms) ? [...policy.perms] : [],
);

const accountCreated = computed(() => {
  const u = me.value as any;
  if (u?.createdAt) {
    return new Date(u.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return "—";
});

const lastLogin = computed(() => {
  const u = me.value as any;
  if (u?.lastLoginAt) {
    return new Date(u.lastLoginAt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return "—";
});

const accountStatus = computed(() => {
  const u = me.value as any;
  if (u?.disabled) return "Disabled";
  if (u?.locked) return "Locked";
  return "Active";
});

const userId = computed(() => {
  const u = me.value as any;
  return u?.id || u?._id || "—";
});

const openChangeEmail = async () => {
  emit("close");
  await ModalService.open(ChangeEmailModal, {
    title: "Change Email Address",
    size: "sm",
  });
};

const openChangePassword = async () => {
  emit("close");
  await ModalService.open(ChangePasswordModal, {
    title: "Change Password",
    size: "sm",
  });
};

const photoInput = ref<HTMLInputElement | null>(null);
const avatarUrl = ref<string | null>(null);

// Load avatar from localStorage on mount
const loadStoredAvatar = () => {
  const stored = localStorage.getItem("profile-avatar");
  if (stored) {
    avatarUrl.value = stored;
  }
};
loadStoredAvatar();

const triggerPhotoUpload = () => {
  photoInput.value?.click();
};

const handlePhotoChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    await AlertService.error("Invalid file", "Please select an image file.");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    await AlertService.error("File too large", "Maximum size is 2 MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    avatarUrl.value = dataUrl;
    // Persist to localStorage
    localStorage.setItem("profile-avatar", dataUrl);
  };
  reader.readAsDataURL(file);

  // TODO: upload to backend when avatar API is ready
  await AlertService.success(
    "Photo updated",
    "Your profile photo has been updated and persisted.",
  );
};
</script>

<template>
  <div class="profile-modal">
    <div
      class="profile-modal__avatar-wrap"
      @click="triggerPhotoUpload"
      title="Change photo"
    >
      <div
        v-if="avatarUrl"
        class="profile-modal__avatar profile-modal__avatar--img"
      >
        <img :src="avatarUrl" alt="Profile photo" />
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

    <dl class="profile-modal__fields">
      <div class="profile-modal__row">
        <dt>Name</dt>
        <dd>{{ displayName }}</dd>
      </div>

      <div class="profile-modal__row">
        <dt>Email</dt>
        <dd>{{ email }}</dd>
      </div>

      <div class="profile-modal__row">
        <dt>User ID</dt>
        <dd class="profile-modal__mono">{{ userId }}</dd>
      </div>

      <div class="profile-modal__row">
        <dt>Status</dt>
        <dd>
          <span
            class="profile-modal__status"
            :class="`profile-modal__status--${accountStatus.toLowerCase()}`"
          >
            {{ accountStatus }}
          </span>
        </dd>
      </div>

      <div class="profile-modal__row">
        <dt>Account Created</dt>
        <dd>{{ accountCreated }}</dd>
      </div>

      <div class="profile-modal__row">
        <dt>Last Login</dt>
        <dd>{{ lastLogin }}</dd>
      </div>

      <div v-if="roles.length" class="profile-modal__row">
        <dt>Roles</dt>
        <dd>
          <span v-for="r in roles" :key="r" class="profile-modal__badge">{{
            r
          }}</span>
        </dd>
      </div>

      <div v-if="permissions.length" class="profile-modal__row">
        <dt>Permissions</dt>
        <dd class="profile-modal__perms">
          <span v-for="p in permissions" :key="p" class="profile-modal__perm">{{
            p
          }}</span>
        </dd>
      </div>
    </dl>

    <footer class="profile-modal__footer">
      <div class="profile-modal__actions">
        <button
          class="btn btn-outline"
          type="button"
          @click="triggerPhotoUpload"
        >
          Change Photo
        </button>
        <button class="btn btn-outline" type="button" @click="openChangeEmail">
          Change Email
        </button>
        <button
          class="btn btn-outline"
          type="button"
          @click="openChangePassword"
        >
          Change Password
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.profile-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 0;
}

.profile-modal__avatar-wrap {
  position: relative;
  cursor: pointer;
  border-radius: var(--radius-full, 9999px);
  transition: transform 150ms ease;

  &:hover {
    transform: scale(1.05);

    .profile-modal__avatar-overlay {
      opacity: 1;
    }
  }
}

.profile-modal__avatar-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full, 9999px);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  opacity: 0;
  transition: opacity 150ms ease;
}

.profile-modal__avatar {
  display: grid;
  place-items: center;
  width: 4.5rem;
  height: 4.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-fg, #fff);
  background: var(--primary);
  border-radius: var(--radius-full, 9999px);

  &--img {
    overflow: hidden;
    padding: 0;
    background: transparent;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
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

.profile-modal__fields {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
}

.profile-modal__row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;

  dt {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  dd {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--text-1);
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
}

.profile-modal__badge {
  display: inline-flex;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-full, 9999px);
  background: var(--primary-alpha, rgba(59, 130, 246, 0.12));
  color: var(--primary);
}

.profile-modal__perms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-height: 7.5rem;
  overflow-y: auto;
}

.profile-modal__perm {
  display: inline-flex;
  padding: 0.0625rem 0.375rem;
  font-size: 0.6875rem;
  font-family: var(--font-mono, monospace);
  border-radius: var(--radius-sm, 6px);
  background: var(--surface-2);
  color: var(--text-2);
}

.profile-modal__mono {
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  color: var(--text-2);
}

.profile-modal__status {
  display: inline-flex;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-full, 9999px);

  &--active {
    background: var(
      --success-soft,
      color-mix(in oklab, var(--success) 15%, transparent)
    );
    color: var(--success, #16a34a);
  }

  &--disabled,
  &--locked {
    background: var(
      --danger-soft,
      color-mix(in oklab, var(--danger) 15%, transparent)
    );
    color: var(--danger, #ef4444);
  }
}

.profile-modal__footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-1);
}

.profile-modal__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}
</style>
