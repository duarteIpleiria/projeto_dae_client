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
const table = useTemplateRef('table')

const selectedUser = ref<UserData | null>(null)
const selectedUserForRoleChange = ref<UserData | null>(null)

const { data, error, refresh, status } = useFetch(`${api}/users`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const users = computed(() => (data.value as any) || []);

function getRowItems(row: Row<UserData>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Copy email',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.email)
        toast.add({
          title: 'Copied to clipboard',
          description: 'Email copied to clipboard'
        })
      }
    },
    ...(authStore.user.role === 'Administrador' && row.original.id !== authStore.user.id ? [
      {
        type: 'separator'
      },
      {
        label: 'Change Role',
        icon: 'i-lucide-user-cog',
        onSelect() {
          selectedUserForRoleChange.value = row.original
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
        selectedUser.value = row.original
      }
    }
  ]
}

const columns: TableColumn<UserData>[] = [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'email',
    header: 'Email'
  },
  {
    accessorKey: 'role',
    header: 'Role'
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h(
        UDropdownMenu,
        {
          content: { align: 'end' },
          items: getRowItems(row)
        },
        () =>
          h(UButton, {
            icon: 'i-lucide-ellipsis-vertical',
            color: 'neutral',
            variant: 'ghost'
          })
      )
  }
]

const name = computed({
  get: (): string => {
    return (table.value?.tableApi?.getColumn('name')?.getFilterValue() as string) || ''
  },
  set: (value: string) => {
    table.value?.tableApi?.getColumn('name')?.setFilterValue(value || undefined)
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <UDashboardNavbar title="Users">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UsersAddModal @created="refresh" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput v-model="name" class="max-w-sm" icon="i-lucide-search" placeholder="Filter by name..." />
      </div>

      <UTable v-if="status === 'success'" ref="table" :data="users" :columns="columns"
        v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }" />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          Total: {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} users
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)" />
        </div>
      </div>
    </template>
  </UDashboardPanel>

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
</template>
