<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Publication {
  id: number
  title: string
  scientific_area: string
  summary: string
  is_visible: boolean
  file_url: string
  author: {
    id: number
    name: string
  }
  average_rating: number
  ratings_count: number
  comments_count?: number
  tags: Array<{ id: number; name: string }>
  createdAt: string
  updatedAt: string
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
}>()

const isAuthor = computed((): boolean => {
  return !!props.currentUserId &&
    props.publication.author.id === props.currentUserId
})

const visibilityState = ref<boolean>(props.publication.is_visible)

watch(
  () => props.publication.is_visible,
  (val) => {
    visibilityState.value = !!val
  }
)

const visibilityOptions = [
  { label: 'Visível', value: true },
  { label: 'Oculta', value: false }
]

const handleVisibilityChange = () => {
  emit('toggle-visibility', props.publication.id, visibilityState.value)
}

const formattedDate = computed(() => {
  const d = new Date(props.publication.createdAt)

  const pad = n => String(n).padStart(2, '0')

  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
})



const visibilityBadgeColor = computed(() => {
  return props.publication.is_visible ? 'green' : 'gray'
})

const visibilityBadgeLabel = computed(() => {
  return props.publication.is_visible ? 'Visível' : 'Oculta'
})

const visibilityLabel = computed(() => {
  return visibilityState.value ? 'Visível' : 'Oculta'
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
            {{ publication.scientific_area }}
          </p>
        </div>

        <div class="flex gap-2 flex-shrink-0 items-center">
          <UButton v-if="isAuthor" color="secondary" variant="ghost" size="sm"
            :icon="publication.is_visible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
            @click="$emit('toggle-visibility', publication.id, !publication.is_visible)" />
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
      <div v-if="publication.tags.length" class="flex flex-wrap gap-2">
        <UBadge v-for="tag in publication.tags" :key="tag.id" variant="outline"
          class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
          {{ tag.name }}
        </UBadge>
      </div>

      <!-- Ratings e Comentários -->
      <div class="flex items-center gap-4 text-sm">
        <div class="flex items-center gap-1">
          <UIcon name="i-lucide-star" class="w-4 h-4 text-yellow-500" />
          <span class="font-medium">{{ (publication.average_rating || 0).toFixed(1) }}</span>
          <span class="text-gray-500">({{ publication.ratings_count || 0 }})</span>
        </div>
        <div v-if="publication.comments_count !== undefined" class="flex items-center gap-1">
          <UIcon name="i-lucide-message-circle" class="w-4 h-4 text-blue-500" />
          <span class="font-medium">{{ publication.comments_count }}</span>
        </div>
      </div>

      <!-- Ações -->
      <div class="flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        <UButton v-if="isAuthor" color="secondary" variant="ghost" size="sm" icon="i-lucide-pencil" label="Editar"
          @click="$emit('edit-summary', publication)" />

        <UButton v-if="!isAuthor" color="secondary" variant="ghost" size="sm" icon="i-lucide-star" label="Avaliar"
          @click="$emit('rate', publication)" />
      </div>
    </div>
  </UCard>
</template>
