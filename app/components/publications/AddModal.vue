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
const toast = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const schema = z.object({
  title: z.string().min(3, 'Title must have at least 3 characters'),
  scientific_area: z.string().min(3, 'Scientific area is required'),
  is_visible: z.boolean()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  title: '',
  scientific_area: '',
  is_visible: false
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
    file.value = null
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!file.value) {
    toast.add({
      title: 'Error',
      description: 'Please upload a PDF or ZIP file',
      color: 'error'
    })
    return
  }

  if (!ALLOWED_TYPES.includes(file.value.type)) {
    toast.add({
      title: 'Error',
      description: 'Only PDF or ZIP files are allowed',
      color: 'error'
    })
    return
  }

  try {
    await createPublication({
      title: event.data.title,
      scientific_area: event.data.scientific_area,
      is_visible: event.data.is_visible,
      file: file.value
    })

    toast.add({
      title: 'Success',
      description: `Publication "${event.data.title}" created successfully`,
      color: 'success'
    })

    emit('publication-created')
    open.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: error.value || 'Failed to create publication',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" title="New Publication" description="Create a new scientific publication">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">


        <UFormField label="Title" name="title">
          <UInput v-model="state.title" class="w-full" placeholder="e.g., CNN model for tumor detection" />
        </UFormField>

        <!-- Área Científica -->
        <UFormField label="Scientific Area" name="scientific_area">
          <UInput v-model="state.scientific_area" class="w-full" placeholder="e.g., Data Science, Materials Science, Biology" />
        </UFormField>


        <UFormField label="Visibility" name="is_visible">
          <UCheckbox v-model="state.is_visible" label="Publication visible" />
        </UFormField>

       
        <UFormField label="File" name="file">
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
                    Click or drag the file here
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    PDF or ZIP (max 50MB)
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
          <UButton label="Cancel" color="secondary" variant="ghost" type="button" @click="open = false" />
          <UButton label="Create" color="primary" type="submit" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
