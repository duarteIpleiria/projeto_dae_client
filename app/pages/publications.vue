<script setup lang="ts">



import { useAuthStore } from "~/stores/auth-store.js";

const authStore = useAuthStore();
const token = authStore.token;

const config = useRuntimeConfig()
const api = config.public.apiBase


import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'
import type { Publication } from '~/types'
import { vi } from "zod/locales";

const UAvatar = resolveComponent('UAvatar')
const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const toast = useToast()
const table = useTemplateRef('table')

const selectedPublication = ref<Publication | null>(null)
const rowSelection = ref({ 1: true })

const columnFilters = ref([{
  id: 'email',
  value: ''
}])
const columnVisibility = ref()




const { data, error, refresh, status } = useFetch(`${api}/posts`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const publications = computed(() => (data.value as any) || []);

function getRowItems(row: Row<Publication>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Copy publication ID',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.id.toString())
        toast.add({
          title: 'Copied to clipboard',
          description: 'Publication ID copied to clipboard'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'View publication details',
      icon: 'i-lucide-list',
      onSelect() {
        selectedPublication.value = row.original
      }
    },

    {
      type: 'separator'
    },
    {
      label: 'Delete publication',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        toast.add({
          title: 'Publication deleted',
          description: 'The publication has been deleted.'
        })
      }
    }
  ]
}

const columns: TableColumn<Publication>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean) =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean) =>
          row.toggleSelected(!!value),
        ariaLabel: 'Select row'
      })
  },

  {
    accessorKey: 'id',
    header: 'ID'
  },

  {
    accessorKey: 'title',
    header: 'Título'
  },

  {
    accessorKey: 'scientificArea',
    header: 'Área Científica'
  },

  {
    id: 'author',
    header: 'Autor',
    cell: ({ row }) => row.original.author.name
  },

  {
    accessorKey: 'visible',
    header: 'Visível',
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: row.original.visible ? 'success' : 'error',
          variant: 'subtle'
        },
        () => (row.original.visible ? 'Sim' : 'Não')
      )
  },

  {
    accessorKey: 'averageRating',
    header: 'Rating'
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
const statusFilter = ref('all')

watch(() => statusFilter.value, (newVal) => {
  if (!table?.value?.tableApi) return

  const statusColumn = table.value.tableApi.getColumn('status')
  if (!statusColumn) return

  if (newVal === 'all') {
    statusColumn.setFilterValue(undefined)
  } else {
    statusColumn.setFilterValue(newVal)
  }
})

const title = computed({
  get: (): string => {
    return (table.value?.tableApi?.getColumn('title')?.getFilterValue() as string) || ''
  },
  set: (value: string) => {
    table.value?.tableApi?.getColumn('title')?.setFilterValue(value || undefined)
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>

<template>
  <UDashboardPanel id="publicatione">
    <template #header>
      <UDashboardNavbar title="Publications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <PublicationsAddModal @created="refresh" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput v-model="title" class="max-w-sm" icon="i-lucide-search" placeholder="Filter..." />

        <div class="flex flex-wrap items-center gap-1.5">
          <PublicationsDeleteModal :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length">
            <UButton v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length" label="Delete" color="error"
              variant="subtle" icon="i-lucide-trash">
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                </UKbd>
              </template>
            </UButton>
          </PublicationsDeleteModal>


          <UDropdownMenu :items="table?.tableApi
            ?.getAllColumns()
            .filter((column: any) => column.getCanHide())
            .map((column: any) => ({
              label: upperFirst(column.id),
              type: 'checkbox' as const,
              checked: column.getIsVisible(),
              onUpdateChecked(checked: boolean) {
                table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
              },
              onSelect(e?: Event) {
                e?.preventDefault()
              }
            }))
            " :content="{ align: 'end' }">
            <UButton label="Display" color="neutral" variant="outline" trailing-icon="i-lucide-settings-2" />
          </UDropdownMenu>
        </div>
      </div>

      <UTable v-if="status === 'success'" ref="table" :data="publications" :columns="columns"
        v-model:row-selection="rowSelection" v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }" />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
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

  <PublicationsEditModal :publication="selectedPublication" @updated="() => {
    refresh()
    selectedPublication = null
  }" />
</template>
