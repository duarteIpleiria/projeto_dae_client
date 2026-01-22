<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth-store'
import ManageTagsModal from './ManageTagsModal.vue'


interface Comment {
  id: number
  postId: number
  author: {
    id: number
    name: string
  } | null
  comment: string
  createdAt: number
  updatedAt: number | null
  visible: boolean
}

interface Publication {
  id: number
  title: string
  scientificArea?: string
  scientific_area?: string
  summary: string
  visible?: boolean
  is_visible?: boolean
  fileUrl?: string
  file_url?: string
  fileName?: string
  filename?: string
  fileKey?: string
  filekey?: string
  author: {
    id: number
    name: string
  }
  averageRating?: number
  average_rating?: number
  ratingsCount?: number
  ratings_count?: number
  comments_count?: number
  comments?: Comment[]
  tags: Array<{ id: number; name: string; visible?: boolean }>
  createdAt: number | string
  updatedAt: number | string | null
}

interface Props {
  publication: Publication
  currentUserId?: number
  showHistory?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showHistory: false
})

const emit = defineEmits<{
  'toggle-visibility': [publicationId: number, currentVisibility: boolean]
  'rate': [publication: Publication]
  'edit-summary': [publication: Publication]
  'tags-updated': [publication: Publication]
  'comment-added': [publicationId: number, comment: Comment]
}>()

const authStore = useAuthStore()

// Check if user can manage comment visibility
const canManageComments = computed(() => {
  const canManage = authStore.user?.role === 'Administrador' || authStore.user?.role === 'Responsavel'
  console.log('👤 User role:', authStore.user?.role, '| Can manage comments:', canManage)
  return canManage
})

// Check if user can view history (only authenticated users with specific roles)
const canViewHistory = computed(() => {
  if (!authStore.user) return false
  const role = authStore.user?.role
  return role === 'Colaborador' || role === 'Responsavel' || role === 'Administrador'
})

// Filter comments to display based on visibility
// Admin/Responsavel can see all comments, others only see visible ones
const visibleComments = computed(() => {
  if (!props.publication.comments) return []
  
  // Admin and Responsavel can see all comments (including hidden ones)
  if (canManageComments.value) {
    return props.publication.comments
  }
  
  // Other users only see visible comments
  return props.publication.comments.filter(comment => comment.visible !== false)
})

// Filter tags to display (exclude hidden tags for ALL users)
// Hidden tags should only be visible in the tags management page
const visibleTags = computed(() => {
  return props.publication.tags.filter(tag => {
    // Filtrar tags ocultas para TODOS os usuários (incluindo admin)
    return tag.visible === true || tag.visible === undefined || tag.visible === null
  })
})

const isAuthor = computed((): boolean => {
  return !!props.currentUserId &&
    props.publication.author.id === props.currentUserId
})

// Check if user can change publication visibility (author or admin/responsavel)
const canChangeVisibility = computed(() => {
  return isAuthor.value || canManageComments.value
})

const showComments = ref(true)
const newComment = ref('')
const commentLoading = ref(false)
const manageTagsModalOpen = ref(false)
const showHistoryDropdown = ref(false)
const historyData = ref<any[]>([])
const historyLoading = ref(false)
const currentHistoryPage = ref(1)
const totalHistoryItems = ref(0)
const historyItemsPerPage = 5
const downloadingFile = ref(false)
const togglingAllComments = ref(false)

const toast = useToast()
const config = useRuntimeConfig()
const api = config.public.apiBase
const token = useCookie('auth_token').value

const visibilityOptions = [
  { label: 'Visível', value: true },
  { label: 'Oculta', value: false }
]

const handleVisibilityChange = () => {
  emit('toggle-visibility', props.publication.id, visibilityState.value)
}

// ===== HISTÓRICO =====
const toggleHistory = async () => {
  showHistoryDropdown.value = !showHistoryDropdown.value
  if (showHistoryDropdown.value && historyData.value.length === 0) {
    await loadHistory(1)
  }
}

const loadHistory = async (page: number = 1) => {
  try {
    historyLoading.value = true
    const response = await $fetch(`${api}/posts/${props.publication.id}/history`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: {
        page,
        limit: historyItemsPerPage
      }
    }) as any

    historyData.value = response.data || []
    totalHistoryItems.value = response.total || 0
    currentHistoryPage.value = page
  } catch (error) {
    console.error('Erro ao carregar histórico:', error)
    toast.add({
      title: 'Erro',
      description: 'Falha ao carregar histórico',
      color: 'error'
    })
  } finally {
    historyLoading.value = false
  }
}

const formatHistoryDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatHistoryChanges = (entry: any): string => {
  const changes = entry.changes
  if (!changes || typeof changes !== 'object') return 'Sem alterações'

  const messages: string[] = []

  // Helper para extrair valor de objetos complexos JSON
  const extractValue = (obj: any): string => {
    if (!obj) return ''
    if (typeof obj === 'string') return obj
    if (typeof obj === 'number') return String(obj)
    if (typeof obj === 'boolean') return obj ? 'Sim' : 'Não'
    
    // Objetos JSON do backend
    if (obj.string) return obj.string
    if (obj.chars) return obj.chars
    if (obj.valueType === 'TRUE') return 'Sim'
    if (obj.valueType === 'FALSE') return 'Não'
    if (obj.valueType === 'NUMBER' && obj.value !== undefined) return String(obj.value)
    
    // Arrays (tags)
    if (Array.isArray(obj)) {
      return obj.map(item => {
        if (typeof item === 'string') return item
        if (item?.name?.string) return item.name.string
        if (item?.name) return item.name
        return JSON.stringify(item)
      }).join(', ')
    }
    
    return String(obj)
  }

  // Helper para extrair booleano
  const extractBoolean = (obj: any): boolean => {
    if (obj === true || obj === 'true') return true
    if (obj === false || obj === 'false') return false
    if (typeof obj === 'string') {
      const lower = obj.toLowerCase()
      return lower === 'true' || lower === 'sim' || lower === 'yes'
    }
    if (typeof obj === 'object') {
      if (obj.valueType === 'TRUE') return true
      if (obj.valueType === 'FALSE') return false
      if (obj.value !== undefined) return Boolean(obj.value)
    }
    return Boolean(obj)
  }

  for (const [field, value] of Object.entries(changes)) {
    // Criação da publicação
    if (field === 'created' || field === 'creation') {
      messages.push('Publicação criada')
      continue
    }

    // Título
    if (field === 'title') {
      // Verificar se tem estrutura old/new
      if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
        const newVal = extractValue(value.new)
        if (newVal) {
          messages.push(`Título: "${newVal}"`)
        } else {
          messages.push('Título alterado')
        }
      } else {
        const val = extractValue(value)
        if (val) {
          messages.push(`Título: "${val}"`)
        } else {
          messages.push('Título alterado')
        }
      }
      continue
    }

    // Resumo
    if (field === 'summary') {
      // Verificar se tem estrutura old/new
      if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
        const newVal = extractValue(value.new)
        if (newVal && newVal.length < 100) {
          messages.push(`Resumo: ${newVal}`)
        } else {
          messages.push('Resumo atualizado')
        }
      } else {
        const val = extractValue(value)
        if (val && val.length < 100) {
          messages.push(`Resumo: ${val}`)
        } else {
          messages.push('Resumo atualizado')
        }
      }
      continue
    }

    // Área científica
    if (field === 'scientificArea' || field === 'scientific_area') {
      // Verificar se tem estrutura old/new
      if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
        const newVal = extractValue(value.new)
        if (newVal) {
          messages.push(`Área científica: ${newVal}`)
        } else {
          messages.push('Área científica alterada')
        }
      } else {
        const val = extractValue(value)
        if (val) {
          messages.push(`Área científica: ${val}`)
        } else {
          messages.push('Área científica alterada')
        }
      }
      continue
    }

    // Visibilidade
    if (field === 'visible' || field === 'visibility' || field === 'isVisible' || field === 'is_visible') {
      // Verificar se tem estrutura old/new
      if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
        // Usar extractBoolean para processar o objeto {valueType: 'TRUE'/'FALSE'}
        const newVal = extractBoolean(value.new)
        messages.push(newVal ? 'Publicação tornada visível' : 'Publicação ocultada')
      } else {
        const val = extractValue(value).toLowerCase()
        const isVisible = val === 'sim' || val === 'true' || val.includes('visível')
        messages.push(isVisible ? 'Publicação tornada visível' : 'Publicação ocultada')
      }
      continue
    }

    // Tags
    if (field === 'tags') {
      const val = extractValue(value)
      if (val) {
        messages.push(`Tags: ${val}`)
      } else {
        messages.push('Tags atualizadas')
      }
      continue
    }

    // Comentários
    if (field === 'comment' || field === 'commentAdded') {
      // Verificar se tem estrutura old/new
      if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
        const val = extractValue(value.new)
        messages.push(val || 'Comentário adicionado')
      } else {
        const val = extractValue(value)
        messages.push(val || 'Comentário adicionado')
      }
      continue
    }

    // Ratings
    if (field === 'rating') {
      // Verificar se tem estrutura old/new
      if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
        const val = extractValue(value.new)
        messages.push(val || 'Avaliação recebida')
      } else {
        const val = extractValue(value)
        messages.push(val || 'Avaliação recebida')
      }
      continue
    }

    // Visibilidade de comentários
    if (field === 'commentVisibility') {
      // Verificar se tem estrutura old/new
      if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
        const val = extractValue(value.new)
        messages.push(val || 'Visibilidade de comentário alterada')
      } else {
        const val = extractValue(value)
        messages.push(val || 'Visibilidade de comentário alterada')
      }
      continue
    }

    // Arquivo
    if (field === 'file' || field === 'fileName') {
      const val = extractValue(value)
      if (val && val !== '[object Object]') {
        messages.push(`Arquivo: ${val}`)
      } else {
        messages.push('Arquivo anexado')
      }
      continue
    }

    // Outros campos genéricos
    const val = extractValue(value)
    if (val && val !== '[object Object]') {
      messages.push(`${field}: ${val}`)
    }
  }

  return messages.length > 0 ? messages.join('\n') : 'Alterações realizadas'
}

// ===== COMENTÁRIOS =====
const submitComment = async () => {
  if (!newComment.value.trim()) {
    toast.add({
      title: 'Erro',
      description: 'Comentário não pode estar vazio',
      color: 'error'
    })
    return
  }

  try {
    commentLoading.value = true
    
    const endpoint = `${api}/posts/${props.publication.id}/comments`
    const payload = { comment: newComment.value }
    
    console.log('[COMMENT POST] Endpoint:', endpoint)
    console.log('[COMMENT POST] Payload:', payload)
    console.log('[COMMENT POST] Token:', token ? 'presente' : 'ausente')
    
    const response = await $fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: payload
    }) as any

    console.log('[COMMENT POST] Resposta do backend:', response)
    newComment.value = ''
    toast.add({
      title: 'Sucesso',
      description: 'Comentário adicionado com sucesso',
      color: 'success'
    })
    
    // Emitir evento para o componente pai atualizar
    emit('comment-added', props.publication.id, response)
    
    // Recarregar histórico se estiver aberto
    if (showHistoryDropdown.value) {
      loadHistory()
    }
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error)
    toast.add({
      title: 'Erro',
      description: 'Falha ao adicionar comentário',
      color: 'error'
    })
  } finally {
    commentLoading.value = false
  }
}

// ===== TOGGLE VISIBILITY DE COMENTÁRIO =====
const togglingCommentVisibility = ref<Record<number, boolean>>({})

// Computed para determinar se a maioria dos comentários está visível
const commentsVisibilityState = computed(() => {
  if (!props.publication.comments || props.publication.comments.length === 0) {
    return null
  }
  const visibleCount = props.publication.comments.filter(c => c.visible).length
  return visibleCount >= props.publication.comments.length / 2
})

const toggleCommentVisibility = async (commentId: number, currentVisibility: boolean) => {
  try {
    togglingCommentVisibility.value[commentId] = true
    
    await $fetch(`${api}/posts/${props.publication.id}/comments/${commentId}/visibility`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json; charset=UTF-8',
        'Accept-Charset': 'UTF-8'
      },
      body: {
        visible: !currentVisibility
      }
    })

    // Atualizar localmente
    const comment = props.publication.comments?.find(c => c.id === commentId)
    if (comment) {
      comment.visible = !currentVisibility
    }

    toast.add({
      title: 'Sucesso',
      description: currentVisibility ? 'Comentário ocultado' : 'Comentário visível',
      color: 'success'
    })
  } catch (error) {
    console.error('Erro ao alterar visibilidade do comentário:', error)
    toast.add({
      title: 'Erro',
      description: 'Erro ao alterar visibilidade do comentário',
      color: 'error'
    })
  } finally {
    delete togglingCommentVisibility.value[commentId]
  }
}

// ===== TOGGLE VISIBILITY DE TODOS OS COMENTÁRIOS =====
const toggleAllCommentsVisibility = async () => {
  if (!props.publication.comments || props.publication.comments.length === 0) {
    toast.add({
      title: 'Aviso',
      description: 'Não há comentários nesta publicação',
      color: 'warning'
    })
    return
  }

  // Determinar o novo estado baseado na maioria dos comentários
  const visibleCount = props.publication.comments.filter(c => c.visible).length
  const newVisibility = visibleCount < props.publication.comments.length / 2

  try {
    togglingAllComments.value = true
    
    const response = await $fetch(`${api}/posts/${props.publication.id}/comments/visibility`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: {
        visible: newVisibility
      }
    }) as any

    // Atualizar todos os comentários localmente
    if (props.publication.comments) {
      props.publication.comments.forEach(comment => {
        comment.visible = newVisibility
      })
    }

    toast.add({
      title: 'Sucesso',
      description: response.message || (newVisibility ? 'Comentários visíveis' : 'Comentários ocultados'),
      color: 'success'
    })
  } catch (error: any) {
    console.error('Erro ao alterar visibilidade dos comentários:', error)
    
    let errorMessage = 'Falha ao alterar visibilidade dos comentários'
    if (error.status === 403) {
      errorMessage = 'Não tem permissão para alterar a visibilidade dos comentários'
    } else if (error.status === 404) {
      errorMessage = 'Publicação não encontrada'
    } else if (error.data?.message) {
      errorMessage = error.data.message
    }
    
    toast.add({
      title: 'Erro',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    togglingAllComments.value = false
  }
}

const formattedDate = computed(() => {
  const timestamp = typeof props.publication.createdAt === 'number' 
    ? props.publication.createdAt 
    : new Date(props.publication.createdAt as string).getTime()
  
  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
})

// Função para formatar data de comentários
const formatCommentDate = (timestamp: number): string => {
  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Getters para normalizar campos camelCase/snake_case
const getScientificArea = computed(() => {
  return props.publication.scientificArea || props.publication.scientific_area || ''
})

const getIsVisible = computed(() => {
  return props.publication.is_visible ?? props.publication.visible ?? false
})

const getAverageRating = computed(() => {
  return props.publication.average_rating ?? props.publication.averageRating ?? 0
})

const getRatingsCount = computed(() => {
  return props.publication.ratings_count ?? props.publication.ratingsCount ?? 0
})

const visibilityBadgeColor = computed(() => {
  return getIsVisible.value ? 'success' : 'neutral'
})

const visibilityBadgeLabel = computed(() => {
  return getIsVisible.value ? 'Visível' : 'Oculta'
})

const visibilityLabel = computed(() => {
  return visibilityState.value ? 'Visível' : 'Oculta'
})

// Inicializar visibilityState após getIsVisible estar definido
const visibilityState = ref<boolean>(getIsVisible.value)

watch(
  () => getIsVisible.value,
  (val) => {
    visibilityState.value = !!val
  }
)

const handleTagsUpdated = (updatedPublication: Publication) => {
  // Update local tags
  if (updatedPublication.tags) {
    props.publication.tags = updatedPublication.tags
  }
  emit('tags-updated', updatedPublication)
  
  // Recarregar histórico se estiver aberto
  if (showHistoryDropdown.value) {
    loadHistory()
  }
}

// ===== DOWNLOAD DO FICHEIRO =====
const downloadFile = async () => {
  if (!props.publication) return
  
  try {
    downloadingFile.value = true
    const authStore = useAuthStore()
    const token = authStore.token

    const response = await fetch(`${api}/posts/${props.publication.id}/download`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Erro ao fazer download')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = props.publication.fileName || 'ficheiro'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.add({
      title: 'Sucesso',
      description: 'Download iniciado',
      color: 'success'
    })
  } catch (error) {
    console.error('Erro ao fazer download:', error)
    toast.add({
      title: 'Erro',
      description: 'Erro ao fazer download do ficheiro',
      color: 'error'
    })
  } finally {
    downloadingFile.value = false
  }
}

const hasFile = computed(() => {
  const fileName = props.publication.fileName || props.publication.filename
  const fileKey = props.publication.fileKey || props.publication.filekey
  return !!(fileName && fileKey)
})

</script>

<template>
  <UCard class="hover:shadow-md transition-shadow">
    <div class="space-y-4">
      <!-- Cabeçalho com título e badges -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold truncate text-gray-900 dark:text-white">
            {{ publication.title }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ getScientificArea }}
          </p>
        </div>

        <div class="flex gap-2 flex-shrink-0 items-center">
          <UButton v-if="canChangeVisibility" color="secondary" variant="ghost" size="sm"
            :icon="getIsVisible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
            @click="$emit('toggle-visibility', publication.id, !getIsVisible)" />
          <UBadge v-else :color="visibilityBadgeColor" variant="subtle">
            {{ visibilityBadgeLabel }}
          </UBadge>
        </div>
      </div>

      <!-- Resumo -->
      <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
        {{ publication.summary }}
      </p>

      <!-- Autor e Data -->
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <UIcon name="i-lucide-user" class="w-4 h-4" />
        <span>{{ publication.author.name }}</span>
        <span>•</span>
        <UIcon name="i-lucide-calendar" class="w-4 h-4" />
        <span>{{ formattedDate }}</span>
      </div>

      <!-- Tags -->
      <div v-if="visibleTags.length" class="flex flex-wrap gap-2">
        <UBadge v-for="tag in visibleTags" :key="tag.id" variant="outline"
          class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
          {{ tag.name }}
        </UBadge>
      </div>

      <!-- Ratings e Comentários -->
      <div class="flex items-center gap-4 text-sm">
        <div class="flex items-center gap-1">
          <UIcon name="i-lucide-star" class="w-4 h-4 text-yellow-500" />
          <span class="font-medium">{{ getAverageRating.toFixed(1) }}</span>
          <span class="text-gray-500">({{ getRatingsCount }})</span>
        </div>
        <div v-if="visibleComments.length > 0" class="flex items-center gap-1">
          <UIcon name="i-lucide-message-circle" class="w-4 h-4 text-blue-500" />
          <span class="font-medium">{{ visibleComments.length }}</span>
        </div>
      </div>

      <!-- Ações -->
      <div class="flex items-center gap-2 pt-4">
        <UButton v-if="isAuthor" color="secondary" variant="ghost" size="sm" icon="i-lucide-pencil" label="Editar"
          @click="$emit('edit-summary', publication)" />

        <UButton v-if="props.showHistory && canViewHistory"
          color="secondary" variant="ghost" size="sm"
          :icon="showHistoryDropdown ? 'i-lucide-chevron-up' : 'i-lucide-history'" 
          :label="showHistoryDropdown ? 'Ocultar Histórico' : 'Histórico'"
          @click="toggleHistory" />

        <UButton v-if="authStore.user" color="secondary" variant="ghost" size="sm" icon="i-lucide-tags" label="Manage Tags"
          @click="manageTagsModalOpen = true" />

        <UButton v-if="hasFile" color="secondary" variant="ghost" size="sm" icon="i-lucide-download" label="Download"
          :loading="downloadingFile"
          @click="downloadFile" />

        <UButton v-if="!isAuthor && authStore.user" color="secondary" variant="ghost" size="sm" icon="i-lucide-star" label="Avaliar"
          @click="$emit('rate', publication)" />

        <UButton v-if="!isAuthor && authStore.user" 
          color="secondary" variant="ghost" size="sm" 
          icon="i-lucide-message-circle"
          label="Comentar"
          @click="showComments = true" />

        <UButton v-if="visibleComments.length > 0" 
          color="secondary" variant="ghost" size="sm" 
          :icon="showComments ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          :label="`Comentários (${visibleComments.length})`"
          @click="showComments = !showComments" />
      </div>

      <!-- Pré-visualização de Comentários (mostrar sempre se existirem) -->
      <div v-if="visibleComments.length > 0 && !showComments" class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-lucide-message-circle" class="w-4 h-4" />
          Comentários ({{ visibleComments.length }})
        </h4>
        
        <!-- Mostrar apenas os últimos 2 comentários -->
        <div class="space-y-2">
          <div v-for="comment in visibleComments.slice(-2)" :key="comment.id" 
            class="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <div class="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span class="text-xs font-semibold text-white">
                      {{ (comment.author?.name?.[0] || 'A').toUpperCase() }}
                    </span>
                  </div>
                  <span class="text-xs font-semibold text-gray-900 dark:text-white">
                    {{ comment.author?.name || 'Utilizador' }}
                  </span>
                </div>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {{ formatCommentDate(comment.createdAt) }}
              </span>
            </div>
            <p class="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 pl-7">{{ comment.comment }}</p>
          </div>
        </div>

        <!-- Botão para Ver Todos -->
        <UButton 
          v-if="publication.comments.length > 2"
          color="secondary" 
          variant="ghost" 
          size="xs"
          icon="i-lucide-arrow-down"
          label="Ver todos os comentários"
          @click="showComments = true"
          class="w-full"
        />
      </div>

      <!-- Comentários -->
      <div v-if="showComments" class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
        <!-- Lista de Comentários -->
        <div v-if="visibleComments.length > 0" class="space-y-3">
          <!-- Header dos Comentários com Toggle All -->
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-lucide-message-circle" class="w-4 h-4" />
              Comentários ({{ visibleComments.length }})
            </h4>
            
            <!-- Toggle All Comments Button (Only for Admin/Responsavel) -->
            <UButton 
              v-if="canManageComments"
              :icon="commentsVisibilityState ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              size="xs"
              color="primary"
              variant="ghost"
              :loading="togglingAllComments"
              @click="toggleAllCommentsVisibility"
            >
              {{ commentsVisibilityState ? 'Ocultar Todos' : 'Mostrar Todos' }}
            </UButton>
          </div>
          
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div v-for="comment in visibleComments" :key="comment.id" 
              class="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                      <span class="text-xs font-semibold text-white">
                        {{ (comment.author?.name?.[0] || 'A').toUpperCase() }}
                      </span>
                    </div>
                    <span class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ comment.author?.name || 'Utilizador' }}
                    </span>
                    <UBadge v-if="!comment.visible" color="neutral" variant="subtle" size="xs">
                      Oculto
                    </UBadge>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {{ formatCommentDate(comment.createdAt) }}
                  </span>
                  <UButton 
                    v-if="canManageComments"
                    :icon="comment.visible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :loading="togglingCommentVisibility[comment.id]"
                    @click="toggleCommentVisibility(comment.id, comment.visible)"
                  />
                </div>
              </div>
              <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-8">{{ comment.comment }}</p>
            </div>
          </div>
        </div>

        <!-- Formulário para Adicionar Comentário (apenas para usuários autenticados) -->
        <div v-if="authStore.user" class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-lucide-edit" class="w-4 h-4" />
            Deixe seu Comentário
          </h4>
          <div class="space-y-2">
            <UTextarea 
              v-model="newComment"
              placeholder="Escreva seu comentário..."
              :disabled="commentLoading"
              :rows="3"
              class="w-full"
            />
            <div class="flex gap-2 justify-end">
              <UButton 
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showComments = false"
                :disabled="commentLoading"
              >
                Cancelar
              </UButton>
              <UButton 
                color="primary"
                size="sm"
                :loading="commentLoading"
                :disabled="!newComment.trim() || commentLoading"
                @click="submitComment"
                icon="i-lucide-send"
              >
                Enviar
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Botão para Abrir Comentários (quando não há comentários) -->
      <div v-if="!isAuthor && !showComments && publication.comments?.length === 0" class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <UButton 
          color="secondary" 
          variant="ghost" 
          size="sm" 
          icon="i-lucide-message-circle"
          label="Ver Comentários"
          @click="showComments = true"
        />
      </div>
    </div>

    <!-- Manage Tags Modal -->
    <ManageTagsModal
      v-model="manageTagsModalOpen"
      :publication="publication"
      @tags-updated="handleTagsUpdated"
    />

    <!-- Histórico Dropdown -->
    <div v-if="props.showHistory && showHistoryDropdown" class="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Histórico de Atividade
        </h4>
      </div>

      <!-- Loading -->
      <div v-if="historyLoading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader" class="animate-spin text-2xl text-gray-400" />
      </div>

      <!-- Sem histórico -->
      <div v-else-if="historyData.length === 0" class="text-center py-8 text-gray-500 text-sm">
        <UIcon name="i-lucide-history" class="mx-auto text-3xl mb-2" />
        <p>Nenhuma atividade registrada</p>
      </div>

      <!-- Lista de histórico -->
      <div v-else class="space-y-3">
        <div 
          v-for="(entry, index) in historyData" 
          :key="entry.edit_id || entry.id || index"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50"
        >
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="flex items-center gap-2">
              <UBadge 
                :color="index === 0 ? 'primary' : 'neutral'" 
                variant="subtle"
                size="xs"
              >
                v{{ entry.version || (totalHistoryItems - ((currentHistoryPage - 1) * historyItemsPerPage) - index) }}
              </UBadge>
              <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                {{ entry.edited_by?.name || entry.editedBy?.name || 'Desconhecido' }}
              </span>
            </div>
            <span class="text-xs text-gray-500">
              {{ formatHistoryDate(entry.edited_at || entry.editedAt) }}
            </span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-gray-300 dark:border-gray-600 whitespace-pre-line">
            {{ formatHistoryChanges(entry) }}
          </p>
        </div>

        <!-- Paginação -->
        <div v-if="totalHistoryItems > historyItemsPerPage" class="flex justify-center pt-2">
          <UPagination 
            :model-value="currentHistoryPage"
            :page-count="Math.ceil(totalHistoryItems / historyItemsPerPage)" 
            :total="totalHistoryItems"
            size="xs"
            @update:model-value="loadHistory"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>
