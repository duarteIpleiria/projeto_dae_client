<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Publication {
  id: number
  title: string
  summary: string
}

interface Props {
  modelValue?: boolean
  publication: Publication | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  publication: null
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'summary-updated': [publicationId: number]
}>()

const { updateSummary, loading } = usePublications()
const toast = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const editedSummary = ref('')

// Atualizar quando a publicação mudar
watch(() => props.publication, (newPub) => {
  if (newPub) {
    editedSummary.value = newPub.summary || ''
  }
}, { immediate: true })

const handleSubmit = async () => {
  if (!props.publication || !editedSummary.value.trim()) {
    toast.add({
      title: 'Erro',
      description: 'O resumo não pode estar vazio',
      color: 'error'
    })
    return
  }

  try {
    await updateSummary(props.publication.id, editedSummary.value)

    toast.add({
      title: 'Sucesso',
      description: 'Resumo atualizado com sucesso',
      color: 'success'
    })

    emit('summary-updated', props.publication.id)
    open.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to update summary',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Edit Summary">
    <template #body>
      <div v-if="publication" class="space-y-4">
        <!-- Título da publicação -->
        <div>
          <h3 class="font-semibold text-lg">{{ publication.title }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Edit the auto-generated summary
          </p>
        </div>

        <UFormGroup label="Summary" description="You can adjust or correct the text before saving">
          <UTextarea v-model="editedSummary" :rows="8" placeholder="Type the publication summary..." />

          <template #help>
            <span class="text-xs text-gray-400">
              {{ editedSummary.length }} caracteres
            </span>
          </template>
        </UFormGroup>


        <!-- Botões -->
        <div class="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
          <UButton label="Cancel" color="da" variant="ghost" @click="open = false" />
          <UButton label="Save" color="primary" :disabled="!editedSummary.trim()" :loading="loading"
            @click="handleSubmit" />
        </div>
      </div>
    </template>
  </UModal>
</template>
