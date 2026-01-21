<script setup lang="ts">
import { useAuthStore } from "~/stores/auth-store.js";

const authStore = useAuthStore();
const token = authStore.token;

const config = useRuntimeConfig()
const api = config.public.apiBase

import type { Tag } from '~/types'

const toast = useToast()

const selectedTag = ref<Tag | null>(null)

// Fetch all tags
const { data, error, refresh, status } = useFetch(`${api}/tags`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Fetch user data with subscribed tags
const { data: userData, refresh: refreshUser } = await useFetch(`${api}/auth/user`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const tags = computed(() => (data.value as any) || []);

// Local state for optimistic updates - initialize immediately from userData
const getInitialSubscribedIds = () => {
  const user = userData.value as any
  if (user && user.subscribedTags && Array.isArray(user.subscribedTags)) {
    return user.subscribedTags.map((tag: Tag) => tag.id)
  }
  return []
}

const localSubscribedTagIds = ref<number[]>(getInitialSubscribedIds())

// Watch for server updates and sync
watch(userData, (newData) => {
  const user = newData as any
  if (user && user.subscribedTags && Array.isArray(user.subscribedTags)) {
    localSubscribedTagIds.value = user.subscribedTags.map((tag: Tag) => tag.id)
  }
}, { immediate: true })

// Get subscribed tag IDs (using local state for instant updates)
const subscribedTagIds = computed(() => {
  return localSubscribedTagIds.value
})

// Check if user can manage tag visibility (Administrador or Responsavel)
const canManageVisibility = computed(() => {
  return authStore.user?.role === 'Administrador' || authStore.user?.role === 'Responsavel'
})

// Separate visible and hidden tags
const visibleTags = computed(() => {
  return tags.value.filter((tag: Tag) => tag.visible !== false)
})

const hiddenTags = computed(() => {
  return tags.value.filter((tag: Tag) => tag.visible === false)
})

// Separate subscribed and unsubscribed tags (only from visible tags, unless admin)
const subscribedTags = computed(() => {
  const tagsToFilter = canManageVisibility.value ? tags.value : visibleTags.value
  return tagsToFilter.filter((tag: Tag) => subscribedTagIds.value.includes(tag.id))
})

const unsubscribedTags = computed(() => {
  const tagsToFilter = canManageVisibility.value ? visibleTags.value : visibleTags.value
  return tagsToFilter.filter((tag: Tag) => !subscribedTagIds.value.includes(tag.id))
})

// Search query for available tags
const searchQuery = ref('')

// Drag and drop state
const isDraggingOver = ref(false)
const isDraggingOverHidden = ref(false)
const draggedTag = ref<Tag | null>(null)

// Loading states
const loadingTagIds = ref<Set<number>>(new Set())

// Hover states for remove buttons
const hoveredTagId = ref<number | null>(null)
const hoveredHiddenTagId = ref<number | null>(null)

// Filtered unsubscribed tags based on search
const filteredUnsubscribedTags = computed(() => {
  if (!searchQuery.value.trim()) {
    return unsubscribedTags.value
  }
  const query = searchQuery.value.toLowerCase().trim()
  return unsubscribedTags.value.filter((tag: Tag) => 
    tag.name.toLowerCase().includes(query)
  )
})

// Drag and drop handlers
function handleDragStart(tag: Tag, event: DragEvent) {
  draggedTag.value = tag
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', tag.id.toString())
  }
}

function handleDragEnd() {
  draggedTag.value = null
  isDraggingOver.value = false
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  isDraggingOver.value = true
}

function handleDragLeave() {
  isDraggingOver.value = false
}

async function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDraggingOver.value = false
  
  if (draggedTag.value) {
    await subscribeToTag(draggedTag.value)
    draggedTag.value = null
  }
}

// Hidden tags drag and drop handlers
function handleDragOverHidden(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  isDraggingOverHidden.value = true
}

function handleDragLeaveHidden() {
  isDraggingOverHidden.value = false
}

async function handleDropHidden(event: DragEvent) {
  event.preventDefault()
  isDraggingOverHidden.value = false
  
  if (draggedTag.value && canManageVisibility.value) {
    await toggleTagVisibility(draggedTag.value, false)
    draggedTag.value = null
  }
}

// Hidden tags to visible drag handlers
async function handleDropToVisible(event: DragEvent) {
  event.preventDefault()
  
  if (draggedTag.value && canManageVisibility.value && draggedTag.value.visible === false) {
    await toggleTagVisibility(draggedTag.value, true)
    draggedTag.value = null
  }
}

// Toggle tag visibility
const { toggleTagVisibility: toggleVisibility } = useTags()

async function toggleTagVisibility(tag: Tag, visible: boolean) {
  loadingTagIds.value.add(tag.id)
  
  try {
    await toggleVisibility(tag.id, visible)

    const action = visible ? 'visível' : 'oculta'
    toast.add({
      title: `Tag ${action}`,
      description: `A tag "${tag.name}" foi marcada como ${action}`,
      color: 'success',
      icon: visible ? 'i-lucide-eye' : 'i-lucide-eye-off',
      timeout: 3000
    })

    // Refresh to sync with server
    await refresh()
    
    // If we just hid a subscribed tag, it should disappear from subscribed bar
    if (!visible && subscribedTagIds.value.includes(tag.id)) {
      localSubscribedTagIds.value = localSubscribedTagIds.value.filter(id => id !== tag.id)
      await refreshUser()
    }
  } catch (error: any) {
    console.error('Error toggling tag visibility:', error)
    
    // Check for permission error
    if (error.status === 403 || error.status === 401) {
      toast.add({
        title: 'Sem permissão',
        description: 'Não tem permissão para alterar a visibilidade de tags',
        color: 'error',
        icon: 'i-lucide-shield-alert',
        timeout: 5000
      })
    } else {
      toast.add({
        title: 'Erro',
        description: error.data?.message || 'Não foi possível alterar a visibilidade da tag',
        color: 'error',
        icon: 'i-lucide-alert-circle',
        timeout: 5000
      })
    }
  } finally {
    loadingTagIds.value.delete(tag.id)
  }
}

async function subscribeToTag(tag: Tag) {
  // Check if already subscribed
  if (localSubscribedTagIds.value.includes(tag.id)) {
    toast.add({
      title: 'Já subscrito',
      description: `Já está subscrito à tag "${tag.name}"`,
      color: 'yellow',
      icon: 'i-lucide-info',
      timeout: 3000
    })
    return
  }

  loadingTagIds.value.add(tag.id)
  
  // Optimistic update - add tag ID immediately
  localSubscribedTagIds.value = [...localSubscribedTagIds.value, tag.id]
  
  try {
    await $fetch(`${api}/tags/${tag.id}/subscribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    toast.add({
      title: 'Tag subscrita!',
      description: `Subscreveu "${tag.name}" com sucesso. Receberá notificações sobre publicações relacionadas.`,
      color: 'success',
      icon: 'i-lucide-bell-ring',
      timeout: 4000
    })

    // Refresh data to sync with server
    await Promise.all([refresh(), refreshUser()])
  } catch (error: any) {
    console.error('Error subscribing to tag:', error)
    console.error('Error status:', error.status)
    console.error('Error data:', error.data)
    
    // Rollback optimistic update on error
    localSubscribedTagIds.value = localSubscribedTagIds.value.filter(id => id !== tag.id)
    
    // Check if error is "already subscribed"
    const errorMessage = typeof error.data === 'string' ? error.data : error.data?.message || ''
    const isAlreadySubscribed = errorMessage.includes('já subscrita') || 
                                errorMessage.includes('already subscribed') ||
                                errorMessage.includes('MyEntityConflictException')
    
    if (isAlreadySubscribed) {
      console.log('Tag already subscribed on server, keeping it subscribed locally')
      // Keep it subscribed if server says it already is
      localSubscribedTagIds.value = [...localSubscribedTagIds.value, tag.id]
      
      // Force refresh to sync with server
      await Promise.all([refresh(), refreshUser()])
      
      toast.add({
        title: 'Já subscrito',
        description: `Já está subscrito à tag "${tag.name}"`,
        color: 'yellow',
        icon: 'i-lucide-info',
        timeout: 3000
      })
    } else {
      toast.add({
        title: 'Erro ao subscrever',
        description: error.data?.message || 'Não foi possível subscrever a tag',
        color: 'error',
        icon: 'i-lucide-alert-circle',
        timeout: 5000
      })
    }
  } finally {
    loadingTagIds.value.delete(tag.id)
  }
}

async function unsubscribeFromTag(tag: Tag) {
  loadingTagIds.value.add(tag.id)
  
  // Optimistic update - remove tag ID immediately
  const previousIds = [...localSubscribedTagIds.value]
  localSubscribedTagIds.value = localSubscribedTagIds.value.filter(id => id !== tag.id)
  
  try {
    await $fetch(`${api}/tags/${tag.id}/subscribe`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    toast.add({
      title: 'Subscrição removida',
      description: `Deixou de subscrever "${tag.name}"`,
      color: 'success',
      icon: 'i-lucide-bell-off',
      timeout: 3000
    })

    // Refresh data to sync with server
    await Promise.all([refresh(), refreshUser()])
  } catch (error: any) {
    console.error('Error unsubscribing from tag:', error)
    
    // Rollback optimistic update on error
    localSubscribedTagIds.value = previousIds
    
    toast.add({
      title: 'Erro ao cancelar subscrição',
      description: error.data?.message || 'Não foi possível cancelar a subscrição',
      color: 'error',
      icon: 'i-lucide-alert-circle',
      timeout: 5000
    })
  } finally {
    loadingTagIds.value.delete(tag.id)
  }
}

</script>

<template>
  <UDashboardPanel id="tags">
    <template #header>
      <UDashboardNavbar title="Gestão de Tags">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TagsAddModal @created="() => { refresh(); refreshUser(); }" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Sticky bars: Subscribed and Hidden tags side by side -->
      <div class="sticky top-0 z-10 bg-background border-b border-default mb-6">
        <div :class="canManageVisibility ? 'grid grid-cols-2 gap-4 p-4' : 'p-4'">
          <!-- Subscribed tags section -->
          <div
            :class="{ 
              'border-r border-default pr-4': canManageVisibility,
              'border-2 border-primary-500 border-dashed rounded-l-md': isDraggingOver && canManageVisibility,
              'border-2 border-primary-500 border-dashed rounded-md': isDraggingOver && !canManageVisibility
            }"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <div class="flex items-center gap-2 mb-3">
              <UIcon name="i-lucide-bookmark-check" class="text-primary size-5" />
              <h3 class="text-sm font-semibold">Tags Subscritas</h3>
              <UBadge color="primary" variant="subtle" size="xs">{{ subscribedTags.length }}</UBadge>
            </div>

            <!-- Subscribed tags -->
            <div v-if="subscribedTags.length > 0" class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              <div
                v-for="tag in subscribedTags"
                :key="tag.id"
                class="relative group"
                @mouseenter="hoveredTagId = tag.id"
                @mouseleave="hoveredTagId = null"
              >
                <UBadge 
                  :label="tag.name" 
                  color="primary"
                  variant="solid"
                  size="md"
                  class="pr-8 cursor-default transition-all"
                  :class="{ 'opacity-50': loadingTagIds.has(tag.id) }"
                />
                <UButton
                  v-if="hoveredTagId === tag.id && !loadingTagIds.has(tag.id)"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="2xs"
                  class="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-error-500 hover:text-white"
                  @click="unsubscribeFromTag(tag)"
                  :aria-label="`Remover subscrição de ${tag.name}`"
                />
                <UIcon 
                  v-if="loadingTagIds.has(tag.id)"
                  name="i-lucide-loader-2" 
                  class="absolute right-2 top-1/2 -translate-y-1/2 animate-spin size-3"
                />
              </div>
            </div>

            <!-- Empty state for subscribed tags -->
            <div v-else class="flex flex-col items-center justify-center py-8 text-center">
              <UIcon name="i-lucide-inbox" class="size-12 text-muted mb-3" />
              <p class="text-sm text-muted">Nenhuma tag subscrita</p>
              <p class="text-xs text-muted mt-1">Adicione tags abaixo clicando ou arrastando para esta área</p>
            </div>

            <!-- Drop zone indicator when dragging -->
            <div 
              v-if="isDraggingOver && draggedTag" 
              class="mt-3 p-3 border-2 border-dashed border-primary-500 rounded-md bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center gap-2"
            >
              <UIcon name="i-lucide-arrow-down" class="size-4 text-primary animate-bounce" />
              <span class="text-sm text-primary font-medium">Solte para subscrever "{{ draggedTag.name }}"</span>
            </div>
          </div>

          <!-- Hidden tags section (only for Administrador and Responsavel) -->
          <div 
            v-if="canManageVisibility"
            :class="{ 
              'pl-4': canManageVisibility,
              'border-2 border-amber-500 border-dashed rounded-r-md': isDraggingOverHidden 
            }"
            @dragover="handleDragOverHidden"
            @dragleave="handleDragLeaveHidden"
            @drop="handleDropHidden"
          >
            <div class="flex items-center gap-2 mb-3">
              <UIcon name="i-lucide-eye-off" class="text-amber-600 dark:text-amber-400 size-5" />
              <h3 class="text-sm font-semibold">Tags Ocultas</h3>
              <UBadge color="amber" variant="subtle" size="xs">{{ hiddenTags.length }}</UBadge>
              <UTooltip text="Apenas visível para Administradores e Responsáveis">
                <UIcon name="i-lucide-info" class="text-muted size-4" />
              </UTooltip>
            </div>

            <!-- Hidden tags -->
            <div v-if="hiddenTags.length > 0" class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              <div
                v-for="tag in hiddenTags"
                :key="tag.id"
                class="relative group"
                @mouseenter="hoveredHiddenTagId = tag.id"
                @mouseleave="hoveredHiddenTagId = null"
              >
                <UBadge 
                  :label="tag.name" 
                  color="amber"
                  variant="soft"
                  size="md"
                  :draggable="!loadingTagIds.has(tag.id)"
                  class="pr-8 cursor-move transition-all opacity-70"
                  :class="{ 'opacity-30': loadingTagIds.has(tag.id) }"
                  @dragstart="handleDragStart(tag, $event)"
                  @dragend="handleDragEnd"
                >
                  <template #leading>
                    <UIcon name="i-lucide-eye-off" class="size-3" />
                  </template>
                </UBadge>
                <UButton
                  v-if="hoveredHiddenTagId === tag.id && !loadingTagIds.has(tag.id)"
                  icon="i-lucide-eye"
                  color="amber"
                  variant="ghost"
                  size="2xs"
                  class="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-success-500 hover:text-white"
                  @click="toggleTagVisibility(tag, true)"
                  :aria-label="`Tornar visível ${tag.name}`"
                >
                  <UTooltip text="Tornar visível">
                    <span class="sr-only">Tornar visível</span>
                  </UTooltip>
                </UButton>
                <UIcon 
                  v-if="loadingTagIds.has(tag.id)"
                  name="i-lucide-loader-2" 
                  class="absolute right-2 top-1/2 -translate-y-1/2 animate-spin size-3"
                />
              </div>
            </div>

            <!-- Empty state for hidden tags -->
            <div v-else class="flex flex-col items-center justify-center py-8 text-center">
              <UIcon name="i-lucide-check-circle" class="size-12 text-muted mb-3" />
              <p class="text-sm text-muted">Nenhuma tag oculta</p>
              <p class="text-xs text-muted mt-1">Arraste tags visíveis para aqui para as ocultar</p>
            </div>

            <!-- Drop zone indicator when dragging -->
            <div 
              v-if="isDraggingOverHidden && draggedTag && draggedTag.visible !== false" 
              class="mt-3 p-3 border-2 border-dashed border-amber-500 rounded-md bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center gap-2"
            >
              <UIcon name="i-lucide-arrow-down" class="size-4 text-amber-600 dark:text-amber-400 animate-bounce" />
              <span class="text-sm text-amber-600 dark:text-amber-400 font-medium">Solte para ocultar "{{ draggedTag.name }}"</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Available tags section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-tags" class="text-muted size-5" />
            <h3 class="text-sm font-semibold">Tags Disponíveis</h3>
            <UBadge color="neutral" variant="subtle" size="xs">{{ unsubscribedTags.length }}</UBadge>
          </div>
          <UInput 
            v-model="searchQuery" 
            icon="i-lucide-search" 
            placeholder="Procurar tags..." 
            class="max-w-xs"
          />
        </div>

        <!-- Available tags grid -->
        <div v-if="filteredUnsubscribedTags.length > 0" class="flex flex-wrap gap-2">
          <div
            v-for="tag in filteredUnsubscribedTags"
            :key="tag.id"
            class="relative group"
          >
            <UBadge
              :label="tag.name"
              color="neutral"
              variant="outline"
              size="md"
              :draggable="!loadingTagIds.has(tag.id)"
              class="cursor-pointer hover:bg-primary-50 hover:border-primary-300 dark:hover:bg-primary-950/20 transition-all"
              :class="{ 
                'opacity-50 cursor-wait': loadingTagIds.has(tag.id),
                'cursor-move': !loadingTagIds.has(tag.id),
                'pr-8': canManageVisibility && !loadingTagIds.has(tag.id)
              }"
              @click="!loadingTagIds.has(tag.id) && subscribeToTag(tag)"
              @dragstart="handleDragStart(tag, $event)"
              @dragend="handleDragEnd"
            >
              <template #leading>
                <UIcon 
                  v-if="loadingTagIds.has(tag.id)"
                  name="i-lucide-loader-2" 
                  class="animate-spin"
                />
                <UIcon 
                  v-else
                  name="i-lucide-plus" 
                  class="group-hover:scale-110 transition-transform"
                />
              </template>
            </UBadge>
            <!-- Hide button for admin users -->
            <UButton
              v-if="canManageVisibility && !loadingTagIds.has(tag.id)"
              icon="i-lucide-eye-off"
              color="neutral"
              variant="ghost"
              size="2xs"
              class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:bg-amber-500 hover:text-white transition-opacity"
              @click.stop="toggleTagVisibility(tag, false)"
              :aria-label="`Ocultar ${tag.name}`"
            >
              <UTooltip text="Ocultar tag">
                <span class="sr-only">Ocultar tag</span>
              </UTooltip>
            </UButton>
          </div>
        </div>

        <!-- Empty state for filtered tags -->
        <div v-else-if="searchQuery && unsubscribedTags.length > 0" class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-3" />
          <p class="text-sm text-muted">Nenhuma tag encontrada para "{{ searchQuery }}"</p>
          <UButton 
            label="Limpar pesquisa" 
            variant="ghost" 
            size="xs" 
            class="mt-2"
            @click="searchQuery = ''"
          />
        </div>

        <!-- Empty state when all tags are subscribed -->
        <div v-else-if="unsubscribedTags.length === 0 && tags.length > 0" class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-lucide-check-circle-2" class="size-12 text-success mb-3" />
          <p class="text-sm font-medium">Todas as tags já estão subscritas!</p>
          <p class="text-xs text-muted mt-1">Não há mais tags disponíveis para subscrever</p>
        </div>

        <!-- Empty state when no tags exist -->
        <div v-else-if="tags.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-lucide-inbox" class="size-12 text-muted mb-3" />
          <p class="text-sm text-muted">Nenhuma tag disponível</p>
          <p class="text-xs text-muted mt-1">Crie a primeira tag usando o botão acima</p>
        </div>

        <!-- Info panel -->
        <div class="mt-6 p-4 bg-muted/30 rounded-lg border border-default">
          <div class="flex gap-3">
            <UIcon name="i-lucide-info" class="size-5 text-primary flex-shrink-0 mt-0.5" />
            <div class="text-sm space-y-1">
              <p class="font-medium">Como usar tags:</p>
              <ul class="text-muted space-y-1 list-disc list-inside">
                <li><strong>Clique</strong> numa tag disponível para a subscrever</li>
                <li><strong>Arraste</strong> uma tag para a área de tags subscritas</li>
                <li><strong>Passe o rato</strong> sobre uma tag subscrita para ver o botão de remover</li>
                <li v-if="canManageVisibility"><strong>Arraste</strong> tags para a área de ocultas ou clique no ícone de olho para ocultar/mostrar</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Stats footer -->
        <div class="flex items-center justify-between text-xs text-muted pt-4 border-t border-default">
          <div>
            Total: <strong>{{ tags.length }}</strong> tags
            <span v-if="canManageVisibility">({{ visibleTags.length }} visíveis, {{ hiddenTags.length }} ocultas)</span>
          </div>
          <div>
            Subscritas: <strong class="text-primary">{{ subscribedTags.length }}</strong> | 
            Disponíveis: <strong>{{ unsubscribedTags.length }}</strong>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <TagsDeleteModal
    :tag="selectedTag"
    @deleted="() => {
      refresh()
      refreshUser()
      selectedTag = null
    }"
    @close="() => {
      selectedTag = null
    }"
  />
</template>
