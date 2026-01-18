<script setup lang="ts">
import { useAuthStore } from "~/stores/auth-store.js";

const authStore = useAuthStore();
const token = authStore.token;

const config = useRuntimeConfig()
const api = config.public.apiBase

import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'
import type { Tag } from '~/types'

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const table = useTemplateRef('table')

const selectedTag = ref<Tag | null>(null)

const { data, error, refresh, status } = useFetch(`${api}/tags`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const tags = computed(() => (data.value as any) || []);

function getRowItems(row: Row<Tag>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Copy tag ID',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.id.toString())
        toast.add({
          title: 'Copied to clipboard',
          description: 'Tag ID copied to clipboard'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Delete tag',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        selectedTag.value = row.original
      }
    }
  ]
}

const columns: TableColumn<Tag>[] = [
  {
    accessorKey: 'id',
    header: 'ID'
  },

  {
    accessorKey: 'name',
    header: 'Name'
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
  <UDashboardPanel id="tags">
    <template #header>
      <UDashboardNavbar title="Tags">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TagsAddModal @created="refresh" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput v-model="name" class="max-w-sm" icon="i-lucide-search" placeholder="Filter..." />
      </div>

      <UTable v-if="status === 'success'" ref="table" :data="tags" :columns="columns"
        v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }" />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          Total: {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} tags
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

  <TagsDeleteModal
    :tag="selectedTag"
    @deleted="() => {
      refresh()
      selectedTag = null
    }"
    @close="() => {
      selectedTag = null
    }"
  />
</template>
