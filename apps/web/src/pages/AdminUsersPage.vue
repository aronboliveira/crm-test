<script setup lang="ts">
import { useAdminUsersPage } from "../assets/scripts/pages/useAdminUsersPage";
import AdminUserDetailsDrawer from "../components/admin/AdminUserDetailsDrawer.vue";
import CreateUserModal from "../components/admin/CreateUserModal.vue";

const {
  createOpen,
  openCreate,
  closeCreate,
  can,
  st,
  rows,
  busy,
  nextCursor,
  drawerOpen,
  drawerUserId,
  openDrawer,
  closeDrawer,
  load,
  setRole,
  forceReset,
} = useAdminUsersPage();
</script>

<template>
  <div v-if="can" class="p-4 grid gap-3" aria-label="Admin users">
    <header class="flex flex-wrap gap-2 items-end justify-between">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Users</h1>
        <p class="opacity-70">Admin-only user management.</p>
      </div>

      <div class="grid gap-2" style="min-width: min(520px, 100%)">
        <div class="grid gap-2" style="grid-template-columns: 1fr 180px">
          <label class="grid gap-1">
            <span class="font-semibold">Search</span>
            <input
              class="table-search-input"
              v-model="st.q"
              name="q"
              autocomplete="off"
              aria-label="Search by email"
              placeholder="email contains..."
              @keyup.enter="load(true)"
            />
          </label>

          <label class="grid gap-1">
            <span class="font-semibold">Role</span>
            <select
              class="table-search-input"
              v-model="st.roleKey"
              aria-label="Role filter"
              @change="load(true)"
            >
              <option value="">all</option>
              <option value="viewer">viewer</option>
              <option value="member">member</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
          </label>
        </div>

        <div class="flex gap-2 justify-end">
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="busy"
            :aria-disabled="busy"
            @click="load(true)"
          >
            Refresh
          </button>
        </div>
      </div>
    </header>

    <div class="card p-3 overflow-auto" role="region" aria-label="Users table">
      <table class="min-w-[920px] w-full" role="table" aria-label="Users list">
        <thead>
          <tr class="text-left opacity-80">
            <th class="py-2 pr-3">Email</th>
            <th class="py-2 pr-3">Role</th>
            <th class="py-2 pr-3">Token v</th>
            <th class="py-2 pr-3">Pwd updated</th>
            <th class="py-2 pr-3">Created</th>
            <th class="py-2 pr-3">Actions</th>
            <th class="py-2 pr-3">Locked</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="u in rows" :key="u.id" class="border-t border-white/10">
            <td class="py-2 pr-3 font-semibold">
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                aria-label="Open user details"
                @click="openDrawer(u)"
              >
                {{ u.email }}
              </button>
            </td>
            <td class="py-2 pr-3">{{ u.roleKey }}</td>
            <td class="py-2 pr-3">{{ u.tokenVersion }}</td>
            <td class="py-2 pr-3">{{ u.passwordUpdatedAt || "-" }}</td>
            <td class="py-2 pr-3">{{ u.createdAt || "-" }}</td>
            <td class="py-2 pr-3">
              <div class="flex gap-2">
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  aria-label="Change role"
                  @click="setRole(u)"
                >
                  Role
                </button>

                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  aria-label="Force reset"
                  @click="forceReset(u)"
                >
                  Force reset
                </button>
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  aria-label="View user"
                  @click="openDrawer(u)"
                >
                  View
                </button>
              </div>
            </td>
            <td class="py-2 pr-3">{{ u.lockedAt ? "yes" : "no" }}</td>
          </tr>

          <tr v-if="!rows.length && !busy">
            <td colspan="7" class="py-6 opacity-70 text-center">No users.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-end">
      <button
        class="btn btn-primary"
        type="button"
        :disabled="busy || !nextCursor"
        :aria-disabled="busy || !nextCursor"
        @click="load(false)"
      >
        Load more
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="busy"
        :aria-disabled="busy"
        @click="openCreate"
      >
        Create user
      </button>
    </div>
    <AdminUserDetailsDrawer
      :open="drawerOpen"
      :userId="drawerUserId"
      @close="closeDrawer"
      @updated="load(true)"
    />
    <CreateUserModal
      :open="createOpen"
      @close="closeCreate"
      @created="load(true)"
    />
  </div>

  <div v-else class="p-6 opacity-70" aria-label="Access denied">
    apps/web/src/pages/{AdminAuditPage,AdminUsersPage}.vue still do not
    recognize my permission. .
  </div>
</template>
