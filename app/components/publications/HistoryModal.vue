<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface HistoryEntry {
  id: number
  postId: number
  editedBy: {
    id: number
    name: string
  }
  editedAt: string | number
  version: number
  changes: Array<{ field: string; value: string }>
}

interface Props {
  modelValue: boolean
  publicationId: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const history = ref<HistoryEntry[]>([])
const loading = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)

const toast = useToast()
const config = useRuntimeConfig()
const api = config.public.apiBase
const authStore = useAuthStore()
const token = authStore.token

// Carregar histórico
const loadHistory = async () => {
  try {
    loading.value = true
    console.log(`Carregando histórico da publicação ${props.publicationId}...`, {
      page: currentPage.value,
      limit: itemsPerPage.value
    })

    const response = await $fetch(`${api}/posts/${props.publicationId}/history`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: {
        page: currentPage.value,
        limit: itemsPerPage.value
      }
    }) as any

    console.log('Histórico recebido:', response)

    const normalizeChanges = (changes: any): Array<{ field: string; value: string }> => {
      if (!changes || typeof changes !== 'object') return []
      
      return Object.entries(changes).map(([field, raw]: [string, any]) => {
        // Formato novo: { new: {...}, old: {...} }
        if (raw?.new && raw?.old) {
          const oldVal = extractValue(raw.old)
          const newVal = extractValue(raw.new)
          return { field, value: `${oldVal} → ${newVal}` }
        }
        
        // Arrays (tags)
        if (Array.isArray(raw)) {
          const val = raw.map((t: any) => t?.name?.string || t?.name || JSON.stringify(t)).join(', ')
          return { field, value: val }
        }

        // Objetos com valueType / chars / string
        if (raw && typeof raw === 'object') {
          if (raw.valueType === 'TRUE') return { field, value: 'Visível: Sim' }
          if (raw.valueType === 'FALSE') return { field, value: 'Visível: Não' }
          if (raw.string) return { field, value: String(raw.string) }
          if (raw.chars) return { field, value: String(raw.chars) }
          if (raw.valueType === 'NUMBER' && raw.integral && raw.value !== undefined) return { field, value: String(raw.value) }
        }

        // Fallback
        return { field, value: JSON.stringify(raw) }
      })
    }

    // Helper para extrair valor de objetos complexos
    const extractValue = (obj: any): string => {
      if (!obj) return '—'
      if (typeof obj === 'string') return obj
      if (obj.string) return obj.string
      if (obj.chars) return obj.chars
      if (obj.valueType === 'TRUE') return 'Sim'
      if (obj.valueType === 'FALSE') return 'Não'
      if (obj.value !== undefined) return String(obj.value)
      return JSON.stringify(obj)
    }

    const mapEntry = (item: any, idx: number): HistoryEntry => {
      const changes = normalizeChanges(item.changes)
      return {
        id: item.edit_id ?? item.id ?? idx,
        postId: item.post_id ?? item.postId ?? 0,
        editedBy: item.edited_by ?? item.editedBy ?? { id: 0, name: 'Desconhecido' },
        editedAt: item.edited_at ?? item.editedAt ?? item.date ?? '',
        version: item.version ?? 0,
        changes
      }
    }

    // Adaptar para diferentes formatos de resposta
    if (Array.isArray(response)) {
      history.value = response.map(mapEntry)
      totalItems.value = response.length
    } else if (response.history) {
      history.value = (response.history || []).map(mapEntry)
      totalItems.value = response.total || response.history.length
      totalPages.value = response.total_pages || Math.ceil(totalItems.value / itemsPerPage.value)
    } else {
      history.value = []
    }

    console.log(`✅ ${history.value.length} entradas de histórico carregadas`)
  } catch (error: any) {
    console.error('Erro ao carregar histórico:', error)
    toast.add({
      title: 'Erro',
      description: error?.data?.message || 'Falha ao carregar histórico de edições',
      color: 'error'
    })
    history.value = []
  } finally {
    loading.value = false
  }
}

// Formatar data
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Mudar página
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadHistory()
}

// Watch para carregar quando o modal abrir
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    currentPage.value = 1
    loadHistory()
  }
})
</script>

<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-4xl' }">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Histórico de Edições</h3>
          <UButton 
            color="neutral" 
            variant="ghost" 
            icon="i-lucide-x" 
            @click="isOpen = false"
            size="sm"
          />
        </div>
      </template>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-gray-400" />
      </div>

      <!-- Sem histórico -->
      <div v-else-if="history.length === 0" class="text-center py-12 text-gray-500">
        <UIcon name="i-lucide-history" class="mx-auto text-5xl mb-4" />
        <p class="text-lg font-medium">Nenhuma edição encontrada</p>
        <p class="text-sm mt-2">Esta publicação ainda não foi editada</p>
      </div>

      <!-- Lista de edições -->
      <div v-else class="space-y-4">
        <div 
          v-for="(entry, index) in history" 
          :key="entry.id"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <!-- Cabeçalho da versão -->
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex items-center gap-3">
              <UBadge 
                :color="index === 0 ? 'primary' : 'neutral'" 
                variant="subtle"
              >
                Versão {{ entry.version || (history.length - index) }}
              </UBadge>
              <div class="flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-user" class="w-4 h-4 text-gray-500" />
                <span class="font-medium text-gray-700 dark:text-gray-300">
                  {{ entry.editedBy?.name || 'Desconhecido' }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <UIcon name="i-lucide-clock" class="w-3.5 h-3.5" />
              {{ formatDate(entry.editedAt) }}
            </div>
          </div>

          <!-- Conteúdo da versão -->
          <div class="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <div v-if="entry.changes.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma alteração detalhada disponível
            </div>
            <div v-for="change in entry.changes" :key="change.field" class="space-y-1">
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ change.field }}</span>
              <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {{ change.value }}
              </p>
            </div>
          </div>
        </div>

        <!-- Paginação -->
        <div v-if="totalPages > 1" class="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <UPagination 
            :model-value="currentPage"
            :page-count="totalPages" 
            :total="totalItems" 
            size="sm"
            @update:model-value="handlePageChange"
          />
        </div>
      </div>
    </UCard>
  </UModal>
</template>
