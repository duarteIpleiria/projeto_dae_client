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

// Verificar se pode avaliar
const canRate = computed(() => {
  if (!props.publication) return false
  
  const isAuthor = props.currentUserId && props.publication.author.id === props.currentUserId
  
  // Não pode avaliar a própria publicação (independente de visibilidade)
  if (isAuthor) return false
  
  // Pode avaliar publicações visíveis E publicações ocultas de outros users
  return true
})

const errorMessage = computed(() => {
  if (!props.publication) return ''
  
  const isAuthor = props.currentUserId && props.publication.author.id === props.currentUserId
  
  if (isAuthor) {
    return 'Não pode avaliar a sua própria publicação'
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
      title: 'Sucesso',
      description: `Avaliação de ${selectedRating.value} estrela${selectedRating.value > 1 ? 's' : ''} atribuída`,
      color: 'success'
    })

    emit('rating-submitted', props.publication.id, selectedRating.value)
    open.value = false
    selectedRating.value = 0
  } catch (e: any) {
    toast.add({
      title: 'Erro',
      description: e.data?.message || 'Erro ao atribuir avaliação',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Avaliar Publicação">
    <template #body>
      <div v-if="publication" class="space-y-6">
        <!-- Título da publicação -->
        <div>
          <h3 class="font-semibold text-lg">{{ publication.title }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Por {{ publication.author.name }}
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
            Clique para avaliar (1 a 5 estrelas)
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
            {{ selectedRating }} estrela{{ selectedRating > 1 ? 's' : '' }}
          </p>
        </div>

        <!-- Botões -->
        <div class="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
          <UButton
            label="Cancelar"
            color="gray"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            label="Avaliar"
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
