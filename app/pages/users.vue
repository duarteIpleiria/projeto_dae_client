<script setup lang="ts">
import { useAuthStore } from "~/stores/auth-store.js";

const authStore = useAuthStore();
const token = authStore.token;

const config = useRuntimeConfig()
const api = config.public.apiBase

import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'
import type { UserData } from '~/types'

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()

const selectedUser = ref<UserData | null>(null)
const selectedUserForEdit = ref<UserData | null>(null)
const selectedUserForRoleChange = ref<UserData | null>(null)
const selectedUserForToggle = ref<UserData | null>(null)
const selectedUserForView = ref<UserData | null>(null)

const { data, error, refresh, status } = useFetch(`${api}/users`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
  onResponseError({ response }) {
    console.error('[Users Page] API Error:', {
      status: response.status,
      statusText: response.statusText,
      data: response._data
    })
    
    // Check if it's the Hibernate lazy initialization error
    if (response._data?.includes('subscribedTags') && response._data?.includes('no Session')) {
      toast.add({
        title: 'Backend Configuration Error',
        description: 'The backend User entity needs to exclude subscribedTags from the /users endpoint. Contact the backend team.',
        color: 'error',
        icon: 'i-lucide-alert-triangle',
        timeout: 8000
      })
    } else {
      toast.add({
        title: 'Error loading users',
        description: response._data?.message || 'Failed to load users from server',
        color: 'error',
        icon: 'i-lucide-alert-circle',
        timeout: 5000
      })
    }
  },
});

const users = computed(() => (data.value as any) || []);

// Search filter for sidebar
const searchQuery = ref('')
const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) {
    return users.value
  }
  const query = searchQuery.value.toLowerCase()
  return users.value.filter((user: UserData) => 
    user.name.toLowerCase().includes(query) || 
    user.email.toLowerCase().includes(query) ||
    user.role.toLowerCase().includes(query)
  )
})

function getUserActions(user: UserData) {
  const isOwnAccount = user.id === authStore.user.id
  const isAdmin = authStore.user.role === 'Administrador'
  const isActive = user.active !== false

  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Copy email',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(user.email)
        toast.add({
          title: 'Copied to clipboard',
          description: 'Email copied to clipboard'
        })
      }
    },
    ...(isAdmin && !isOwnAccount ? [
      {
        type: 'separator'
      },
      {
        label: 'Edit user',
        icon: 'i-lucide-pencil',
        onSelect() {
          selectedUserForEdit.value = user
        }
      },
      {
        label: 'Change Role',
        icon: 'i-lucide-user-cog',
        onSelect() {
          selectedUserForRoleChange.value = user
        }
      },
      {
        label: isActive ? 'Desativar utilizador' : 'Ativar utilizador',
        icon: isActive ? 'i-lucide-user-x' : 'i-lucide-user-check',
        onSelect() {
          selectedUserForToggle.value = user
        }
      }
    ] : []),
    {
      type: 'separator'
    },
    {
      label: 'Delete user',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        selectedUser.value = user
      }
    }
  ]
}
</script>

<template>
  <UDashboardPanel
    id="users"
    :default-size="25"
    :min-size="20"
    :max-size="35"
    resizable
  >
    <UDashboardNavbar title="Users">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>

      <template #trailing>
        <UBadge :label="filteredUsers.length" variant="subtle" />
      </template>

      <template #right>
        <UsersAddModal @created="refresh" />
      </template>
    </UDashboardNavbar>

    <!-- Sidebar User List -->
    <div class="flex flex-col h-full">
      <!-- Search -->
      <div class="p-3 border-b border-default">
        <UInput 
          v-model="searchQuery" 
          icon="i-lucide-search" 
          placeholder="Search users..." 
          size="sm"
        />
      </div>

      <!-- User List -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="status === 'pending'" class="p-4 text-center text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-6 mx-auto mb-2" />
          <p class="text-sm">Loading users...</p>
        </div>

        <div v-else-if="filteredUsers.length === 0" class="p-8 text-center">
          <UIcon name="i-lucide-users-round" class="size-12 text-muted mx-auto mb-3" />
          <p class="text-sm text-muted">
            {{ searchQuery ? 'No users found' : 'No users yet' }}
          </p>
        </div>

        <div v-else class="divide-y divide-default">
          <button
            v-for="user in filteredUsers"
            :key="user.id"
            :class="[
              'w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-start gap-3',
              selectedUserForView?.id === user.id && 'bg-muted'
            ]"
            @click="selectedUserForView = user"
          >
            <!-- Avatar/Status Indicator -->
            <div class="flex-shrink-0 relative">
              <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UIcon name="i-lucide-user" class="size-5 text-primary" />
              </div>
              <div 
                v-if="user.active !== false"
                class="absolute bottom-0 right-0 size-3 rounded-full bg-success border-2 border-background"
                title="Active"
              />
              <div 
                v-else
                class="absolute bottom-0 right-0 size-3 rounded-full bg-neutral-400 border-2 border-background"
                title="Inactive"
              />
            </div>

            <!-- User Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <p :class="['font-medium text-sm truncate', user.active === false && 'text-muted']">
                  {{ user.name }}
                </p>
                <UBadge 
                  v-if="user.id === authStore.user.id"
                  label="You" 
                  color="primary" 
                  variant="subtle" 
                  size="xs"
                />
              </div>
              <p class="text-xs text-muted truncate">{{ user.email }}</p>
              <div class="flex items-center gap-2 mt-1">
                <UBadge 
                  :label="user.role" 
                  color="neutral" 
                  variant="soft" 
                  size="xs"
                />
              </div>
            </div>

            <!-- Actions Dropdown -->
            <UDropdownMenu
              :items="getUserActions(user)"
              @click.stop
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                size="xs"
                @click.stop
              />
            </UDropdownMenu>
          </button>
        </div>
      </div>
    </div>
  </UDashboardPanel>

  <!-- User Detail View -->
  <div v-if="selectedUserForView" class="flex-1 flex flex-col">
    <UDashboardNavbar :title="selectedUserForView.name">
      <template #right>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="selectedUserForView = null"
        />
      </template>
    </UDashboardNavbar>

    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-2xl mx-auto space-y-6">
        <!-- User Header -->
        <div class="flex items-start gap-4">
          <div class="size-20 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-user" class="size-10 text-primary" />
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h2 class="text-2xl font-bold">{{ selectedUserForView.name }}</h2>
              <UBadge 
                :label="selectedUserForView.active !== false ? 'Ativo' : 'Inativo'"
                :color="selectedUserForView.active !== false ? 'success' : 'neutral'"
                variant="subtle"
              />
            </div>
            <p class="text-muted">{{ selectedUserForView.email }}</p>
          </div>
        </div>

        <!-- User Details Card -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">User Information</h3>
          </template>

          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium text-muted">User ID</label>
              <p class="text-sm">{{ selectedUserForView.id }}</p>
            </div>

            <UDivider />

            <div>
              <label class="text-sm font-medium text-muted">Name</label>
              <p class="text-sm">{{ selectedUserForView.name }}</p>
            </div>

            <UDivider />

            <div>
              <label class="text-sm font-medium text-muted">Email</label>
              <p class="text-sm">{{ selectedUserForView.email }}</p>
            </div>

            <UDivider />

            <div>
              <label class="text-sm font-medium text-muted">Role</label>
              <div class="mt-1">
                <UBadge 
                  :label="selectedUserForView.role" 
                  color="primary" 
                  variant="subtle"
                />
              </div>
            </div>

            <UDivider />

            <div>
              <label class="text-sm font-medium text-muted">Status</label>
              <div class="mt-1 flex items-center gap-2">
                <UBadge 
                  :label="selectedUserForView.active !== false ? 'Active' : 'Inactive'"
                  :color="selectedUserForView.active !== false ? 'success' : 'neutral'"
                  variant="subtle"
                />
                <span class="text-xs text-muted">
                  {{ selectedUserForView.active !== false ? 'User has access to the system' : 'User access is disabled' }}
                </span>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Actions Card -->
        <UCard v-if="authStore.user.role === 'Administrador' && selectedUserForView.id !== authStore.user.id">
          <template #header>
            <h3 class="font-semibold">Admin Actions</h3>
          </template>

          <div class="flex flex-wrap gap-2">
            <UButton
              label="Edit User"
              icon="i-lucide-pencil"
              color="neutral"
              variant="outline"
              @click="selectedUserForEdit = selectedUserForView"
            />
            <UButton
              label="Change Role"
              icon="i-lucide-user-cog"
              color="neutral"
              variant="outline"
              @click="selectedUserForRoleChange = selectedUserForView"
            />
            <UButton
              :label="selectedUserForView.active !== false ? 'Deactivate' : 'Activate'"
              :icon="selectedUserForView.active !== false ? 'i-lucide-user-x' : 'i-lucide-user-check'"
              :color="selectedUserForView.active !== false ? 'warning' : 'success'"
              variant="outline"
              @click="selectedUserForToggle = selectedUserForView"
            />
            <UButton
              label="Delete User"
              icon="i-lucide-trash-2"
              color="error"
              variant="outline"
              @click="selectedUser = selectedUserForView"
            />
          </div>
        </UCard>
      </div>
    </div>
  </div>

  <!-- Empty State when no user selected -->
  <div v-else class="hidden lg:flex flex-1 items-center justify-center">
    <div class="text-center">
      <UIcon name="i-lucide-users-round" class="size-32 text-dimmed mb-4 mx-auto" />
      <p class="text-muted text-lg">Select a user to view details</p>
    </div>
  </div>

  <UsersEditModal
    :user="selectedUserForEdit"
    @updated="() => {
      refresh()
      selectedUserForEdit = null
    }"
    @close="() => {
      selectedUserForEdit = null
    }"
  />

  <UsersDeleteModal
    :user="selectedUser"
    @deleted="() => {
      refresh()
      selectedUser = null
    }"
    @close="() => {
      selectedUser = null
    }"
  />

  <UsersChangeRoleModal
    :user="selectedUserForRoleChange"
    @updated="() => {
      refresh()
      selectedUserForRoleChange = null
    }"
    @close="() => {
      selectedUserForRoleChange = null
    }"
  />

  <UsersToggleActiveModal
    :user="selectedUserForToggle"
    @toggled="() => {
      refresh()
      selectedUserForToggle = null
    }"
    @close="() => {
      selectedUserForToggle = null
    }"
  />
</template>
