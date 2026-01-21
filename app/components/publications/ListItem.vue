<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth-store'
import ManageTagsModal from './ManageTagsModal.vue'
import HistoryModal from './HistoryModal.vue'


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
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'toggle-visibility': [publicationId: number, currentVisibility: boolean]
  'rate': [publication: Publication]
  'edit-summary': [publication: Publication]
  'tags-updated': [publication: Publication]
}>()

const authStore = useAuthStore()

// Check if user can see hidden tags
const canSeeHiddenTags = computed(() => {
  return authStore.user?.role === 'Administrador' || authStore.user?.role === 'Responsavel'
})

// Filter tags to display (exclude hidden tags for non-admin users)
const visibleTags = computed(() => {
  return props.publication.tags.filter(tag => canSeeHiddenTags.value || tag.visible !== false)
})

const isAuthor = computed((): boolean => {
  return !!props.currentUserId &&
    props.publication.author.id === props.currentUserId
})

const showComments = ref(true)
const newComment = ref('')
const commentLoading = ref(false)
const manageTagsModalOpen = ref(false)
const showHistoryModal = ref(false)

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
    const response = await $fetch(`${api}/posts/${props.publication.id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: {
        comment: newComment.value
      }
    }) as any

    console.log('Comentário criado:', response)
    newComment.value = ''
    toast.add({
      title: 'Sucesso',
      description: 'Comentário adicionado com sucesso',
      color: 'success'
    })
    
    // Recarregar comentários
    if (props.publication.comments) {
      props.publication.comments.push(response)
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
}

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
          <UButton v-if="isAuthor" color="secondary" variant="ghost" size="sm"
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
        <div v-if="publication.comments && publication.comments.length > 0" class="flex items-center gap-1">
          <UIcon name="i-lucide-message-circle" class="w-4 h-4 text-blue-500" />
          <span class="font-medium">{{ publication.comments.length }}</span>
        </div>
      </div>

      <!-- Ações -->
      <div class="flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        <UButton v-if="isAuthor" color="secondary" variant="ghost" size="sm" icon="i-lucide-pencil" label="Editar"
          @click="$emit('edit-summary', publication)" />

        <UButton v-if="isAuthor"
          color="secondary" variant="ghost" size="sm"
          icon="i-lucide-history" label="Histórico"
          @click="showHistoryModal = true" />

        <UButton color="secondary" variant="ghost" size="sm" icon="i-lucide-tags" label="Manage Tags"
          @click="manageTagsModalOpen = true" />

        <UButton v-if="!isAuthor" color="secondary" variant="ghost" size="sm" icon="i-lucide-star" label="Avaliar"
          @click="$emit('rate', publication)" />

        <UButton v-if="!isAuthor" 
          color="secondary" variant="ghost" size="sm" 
          icon="i-lucide-message-circle"
          label="Comentar"
          @click="showComments = true" />

        <UButton v-if="!isAuthor && publication.comments && publication.comments.length > 0" 
          color="secondary" variant="ghost" size="sm" 
          :icon="showComments ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          :label="`Comentários (${publication.comments.length})`"
          @click="showComments = !showComments" />
      </div>

      <!-- Pré-visualização de Comentários (mostrar sempre se existirem) -->
      <div v-if="!isAuthor && publication.comments && publication.comments.length > 0 && !showComments" class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-lucide-message-circle" class="w-4 h-4" />
          Comentários ({{ publication.comments.length }})
        </h4>
        
        <!-- Mostrar apenas os últimos 2 comentários -->
        <div class="space-y-2">
          <div v-for="comment in publication.comments.slice(-2)" :key="comment.id" 
            class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
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

      <!-- Comentários (apenas para não-autores) -->
      <div v-if="!isAuthor && showComments" class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
        <!-- Lista de Comentários -->
        <div v-if="publication.comments && publication.comments.length > 0" class="space-y-3">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-lucide-message-circle" class="w-4 h-4" />
            Comentários ({{ publication.comments.length }})
          </h4>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div v-for="comment in publication.comments" :key="comment.id" 
              class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span class="text-xs font-semibold text-white">
                        {{ (comment.author?.name?.[0] || 'A').toUpperCase() }}
                      </span>
                    </div>
                    <span class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ comment.author?.name || 'Utilizador' }}
                    </span>
                  </div>
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {{ formatCommentDate(comment.createdAt) }}
                </span>
              </div>
              <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-8">{{ comment.comment }}</p>
            </div>
          </div>
        </div>

        <!-- Formulário para Adicionar Comentário -->
        <div class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
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

    <!-- History Modal -->
    <HistoryModal
      v-model="showHistoryModal"
      :publication-id="publication.id"
    />
  </UCard>
</template>
