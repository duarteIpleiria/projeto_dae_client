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
      title: 'Erro',
      description: e.data?.message || 'Erro ao atualizar resumo',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Editar Resumo">
    <template #body>
      <div v-if="publication" class="space-y-4">
        <!-- Título da publicação -->
        <div>
          <h3 class="font-semibold text-lg">{{ publication.title }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Edite o resumo gerado automaticamente
          </p>
        </div>

        <!-- Textarea para editar o resumo -->
        <div>
          <label class="text-sm font-medium">Resumo</label>
          <UTextarea
            v-model="editedSummary"
            :rows="8"
            placeholder="Digite o resumo da publicação..."
            class="mt-1"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ editedSummary.length }} caracteres
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
            label="Salvar"
            color="primary"
            :disabled="!editedSummary.trim()"
            :loading="loading"
            @click="handleSubmit"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
