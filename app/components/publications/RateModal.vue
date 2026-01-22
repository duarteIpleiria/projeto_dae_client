<script setup lang="ts">
import { ref, computed } from 'vue'

interface Publication {
  id: number
  title: string
  is_visible: boolean
  author: {
    id: number
    name: string
  }
}

interface Props {
  modelValue?: boolean
  publication: Publication | null
  currentUserId?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  publication: null,
  currentUserId: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'rating-submitted': [publicationId: number, rating: number]
}>()

const { ratePublication, loading } = usePublications()
const toast = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const selectedRating = ref(0)
const hoveredRating = ref(0)

// Check if the user can rate
const canRate = computed(() => {
  if (!props.publication) return false
  
  const isAuthor = props.currentUserId && props.publication.author.id === props.currentUserId
  
  // Cannot rate own publication regardless of visibility
  if (isAuthor) return false
  
  // Can rate visible publications and hidden ones from other users
  return true
})

const errorMessage = computed(() => {
  if (!props.publication) return ''
  
  const isAuthor = props.currentUserId && props.publication.author.id === props.currentUserId
  
  if (isAuthor) {
    return 'You cannot rate your own publication'
  }
  
  return ''
})

const setRating = (rating: number) => {
  if (canRate.value) {
    selectedRating.value = rating
  }
}

const submitRating = async () => {
  if (!props.publication || !canRate.value || selectedRating.value === 0) return

  try {
    await ratePublication(props.publication.id, selectedRating.value)

    toast.add({
      title: 'Success',
      description: `${selectedRating.value}-star rating submitted`,
      color: 'success'
    })

    emit('rating-submitted', props.publication.id, selectedRating.value)
    open.value = false
    selectedRating.value = 0
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to submit rating',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Rate Publication">
    <template #body>
      <div v-if="publication" class="space-y-6">
        <!-- Título da publicação -->
        <div>
          <h3 class="font-semibold text-lg">{{ publication.title }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            By {{ publication.author.name }}
          </p>
        </div>

        <!-- Mensagem de erro se não puder avaliar -->
        <div v-if="!canRate" class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-alert-circle" class="text-red-600 dark:text-red-400" />
            <p class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Estrelas de avaliação -->
        <div v-else class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Click to rate (1 to 5 stars)
          </p>

          <div class="flex gap-2">
            <button
              v-for="star in 5"
              :key="star"
              @click="setRating(star)"
              @mouseenter="hoveredRating = star"
              @mouseleave="hoveredRating = 0"
              class="transition-transform hover:scale-110 focus:outline-none"
            >
              <UIcon
                name="i-lucide-star"
                :class="[
                  'w-10 h-10',
                  (hoveredRating >= star || selectedRating >= star)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                ]"
              />
            </button>
          </div>

          <p v-if="selectedRating > 0" class="text-sm font-medium">
            {{ selectedRating }} star{{ selectedRating > 1 ? 's' : '' }}
          </p>
        </div>

        <!-- Botões -->
        <div class="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
          <UButton
            label="Cancel"
            color="gray"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            label="Submit Rating"
            color="primary"
            :disabled="!canRate || selectedRating === 0"
            :loading="loading"
            @click="submitRating"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
