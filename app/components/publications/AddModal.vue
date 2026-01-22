<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

interface Props {
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

const emit = defineEmits<{
  'publication-created': []
  'update:modelValue': [value: boolean]
}>()

const { createPublication, loading, error } = usePublications()
const authStore = useAuthStore()
const toast = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const isAdminOrResponsavel = computed(() => {
  // Permitir todos os utilizadores autenticados alterarem confidencialidade
  return !!authStore.user
})

const schema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  scientific_area: z.string().min(3, 'A área científica é obrigatória'),
  is_visible: z.boolean(),
  is_confidential: z.boolean()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  title: '',
  scientific_area: '',
  is_visible: false,
  is_confidential: false
})

const file = ref<File | null>(null)
const ALLOWED_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed'
]

// Limpar quando modal fecha
watch(open, (value) => {
  if (!value) {
    state.title = ''
    state.scientific_area = ''
    state.is_visible = false
    state.is_confidential = false
    file.value = null
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!file.value) {
    toast.add({
      title: 'Erro',
      description: 'Por favor, faça upload de um ficheiro PDF ou ZIP',
      color: 'error'
    })
    return
  }

  if (!ALLOWED_TYPES.includes(file.value.type)) {
    toast.add({
      title: 'Erro',
      description: 'Apenas ficheiros PDF ou ZIP são permitidos',
      color: 'error'
    })
    return
  }

  try {
    await createPublication({
      title: event.data.title,
      scientific_area: event.data.scientific_area,
      is_visible: event.data.is_visible,
      is_confidential: event.data.is_confidential,
      file: file.value
    })

    toast.add({
      title: 'Sucesso',
      description: `Publicação "${event.data.title}" criada com sucesso`,
      color: 'success'
    })

    emit('publication-created')
    open.value = false
  } catch (e: any) {
    toast.add({
      title: 'Erro',
      description: error.value || 'Erro ao criar publicação',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Nova Publicação" description="Crie uma nova publicação científica">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">


        <UFormField label="Title" name="title">
          <UInput v-model="state.title" class="w-full" placeholder="Ex: Modelo CNN para deteção de tumores" />
        </UFormField>

        <!-- Área Científica -->
        <UFormField label="Scientific Area" name="scientific_area">
          <UInput v-model="state.scientific_area" class="w-full" placeholder="Ex: Data Science, Materials Science, Biologia, etc..." />
        </UFormField>


        <UFormField label="Visibilidade" name="is_visible">
          <UCheckbox v-model="state.is_visible" label="Publicação visível" />
        </UFormField>

        <!-- Confidencial (todos os utilizadores autenticados) -->
        <UFormField v-if="isAdminOrResponsavel" label="Confidencialidade" name="is_confidential">
          <UCheckbox v-model="state.is_confidential" label="Publicação confidencial (apenas utilizadores autenticados)" />
          <p class="text-xs text-gray-500 mt-1">Visitantes não autenticados não poderão ver esta publicação</p>
        </UFormField>

       
        <UFormField label="Ficheiro" name="file">
          <UFileUpload v-model="file" accept=".pdf,.zip" :multiple="false">
            <template #default="{ open: openFileDialog }">
              <div
                class="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center transition hover:border-primary-500 hover:bg-primary-50 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800"
                @click="openFileDialog()">
                <!-- Ícone -->
                <div
                  class="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600 transition group-hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-400">
                  <UIcon name="i-lucide-upload-cloud" class="h-7 w-7" />
                </div>

                <!-- Texto -->
                <div>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Clique ou arraste o ficheiro aqui
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    PDF ou ZIP (máx. 50MB)
                  </p>
                </div>

                <!-- Ficheiro selecionado -->
                <div v-if="file"
                  class="mt-3 flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm dark:bg-gray-800">
                  <UIcon :name="file.type === 'application/pdf'
                    ? 'i-lucide-file-text'
                    : 'i-lucide-archive'" class="h-4 w-4 text-primary-600" />

                  <span class="max-w-[180px] truncate text-sm text-gray-700 dark:text-gray-300">
                    {{ file.name }}
                  </span>

                  <span class="text-xs text-gray-400">
                    {{ (file.size / 1024 / 1024).toFixed(2) }} MB
                  </span>

                  <!-- Botão remover -->
                  <UButton icon="i-lucide-x" size="xs" color="error" variant="ghost" class="ml-1"
                    @click.stop="file = null" />
                </div>
              </div>
            </template>
          </UFileUpload>
        </UFormField>

        <!-- Botões -->
        <div class="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
          <UButton label="Cancelar" color="secondary" variant="ghost" type="button" @click="open = false" />
          <UButton label="Criar" color="primary" type="submit" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
