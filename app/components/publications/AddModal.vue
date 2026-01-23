<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Tag } from '~/types'

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
const { fetchTags, loading: tagsLoading, error: tagsError } = useTags()
const authStore = useAuthStore()
const toast = useToast()

const availableTags = ref<Tag[]>([])
const selectedTags = ref<number[]>([])
const initialComment = ref('')

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const isAdminOrResponsavel = computed(() => {
  // Permitir todos os utilizadores autenticados alterarem confidencialidade
  return !!authStore.user
})

onMounted(async () => {
  try {
    availableTags.value = await fetchTags()
    console.log('Tags carregadas:', availableTags.value)
    
    if (!availableTags.value || availableTags.value.length === 0) {
      toast.add({
        title: 'Warning',
        description: 'No tags available. You can still create the publication without tags.',
        color: 'orange'
      })
    }
  } catch (e) {
    console.error('Erro ao carregar tags:', e)
    toast.add({
      title: 'Error',
      description: 'Failed to load tags. You can still create the publication without tags.',
      color: 'error'
    })
  }
})

const schema = z.object({
  title: z.string().min(3, 'Title must have at least 3 characters'),
  scientific_area: z.string().min(3, 'Scientific area is required'),
  is_visible: z.boolean(),
  is_confidential: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  title: '',
  scientific_area: '',
  is_visible: false,
  is_confidential: false
})

// Watch for mutual exclusivity between visible and confidential
watch(() => state.is_visible, (newValue) => {
  if (newValue && state.is_confidential) {
    state.is_confidential = false
  }
})

watch(() => state.is_confidential, (newValue) => {
  if (newValue && state.is_visible) {
    state.is_visible = false
  }
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
    selectedTags.value = []
    initialComment.value = ''
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
      is_confidential: event.data.is_confidential,
      file: file.value,
      tags: selectedTags.value,
      initial_comment: initialComment.value.trim() || undefined
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

        <!-- Scientific area -->
        <UFormField label="Scientific Area" name="scientific_area">
          <USelect 
            v-model="state.scientific_area"
            class="w-full"
            :items="[
              { value: 'Peer-reviewed scientific articles', label: 'Peer-reviewed scientific articles' },
              { value: 'Conference proceedings', label: 'Conference proceedings' },
              { value: 'Book chapters or scientific books', label: 'Book chapters or scientific books' },
              { value: 'Technical reports', label: 'Technical reports' },
              { value: 'Patents', label: 'Patents' },
              { value: 'Scientific data (datasets)', label: 'Scientific data (datasets)' },
              { value: 'Software (open source)', label: 'Software (open source)' },
              { value: 'AI models', label: 'AI models' },
              { value: 'Databases', label: 'Databases' },
              { value: 'Master\'s or doctoral theses', label: 'Master\'s or doctoral theses' },
              { value: 'Scientific outreach articles', label: 'Scientific outreach articles' }
            ]"
            placeholder="Select scientific area"
            searchable
          />
        </UFormField>


        <UFormField label="Visibility" name="is_visible">
          <UCheckbox v-model="state.is_visible" label="Publication visible" />
        </UFormField>

        <!-- Confidential (all authenticated users) -->
        <UFormField v-if="isAdminOrResponsavel" label="Confidentiality" name="is_confidential">
          <UCheckbox v-model="state.is_confidential" label="Confidential publication (authenticated users only)" />
          <p class="text-xs text-gray-500 mt-1">Unauthenticated visitors will not see this publication</p>
        </UFormField>

        <!-- Tags -->
        <UFormField label="Tags" name="tags">
          <div v-if="availableTags && availableTags.length > 0">
            <!-- Lista de checkboxes com estilo similar ao textarea -->
            <div class="grid grid-cols-2 gap-3 p-3 border border-gray-200 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700">
              <label v-for="tag in availableTags" :key="tag.id" class="flex items-center space-x-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded cursor-pointer">
                <input 
                  type="checkbox" 
                  :value="tag.id" 
                  v-model="selectedTags"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span class="text-gray-700 dark:text-gray-300">{{ tag.name }}</span>
              </label>
            </div>
            
            <!-- Info sobre tags selecionadas -->
            <div v-if="selectedTags.length > 0" class="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {{ selectedTags.length }} tag{{ selectedTags.length !== 1 ? 's' : '' }} selected
            </div>
          </div>
          
          <div v-else-if="tagsLoading" class="p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-center">
            <UIcon name="i-lucide-loader-2" class="animate-spin w-5 h-5 mx-auto" />
            <p class="text-sm text-gray-500 mt-2">Loading tags...</p>
          </div>
          
          <div v-else class="p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-center">
            <p class="text-sm text-gray-500">{{ tagsError || 'No tags available' }}</p>
          </div>
          
          <p class="text-xs text-gray-500 mt-1">Select tags to categorize your publication</p>
        </UFormField>

        <!-- Initial Comment -->
        <UTextarea
          v-model="initialComment"
          placeholder="Add an initial comment about your publication (optional)"
          :rows="3"
          resize
          class="border border-gray-200 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 w-full p-3"
        />

       
        <UFormField label="File" name="file">
          <UFileUpload v-model="file" accept=".pdf,.zip" :multiple="false">
            <template #default="{ open: openFileDialog }">
              <div
                class="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center transition hover:border-primary-500 hover:bg-primary-50 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800"
                @click="openFileDialog()">
                <!-- Icon -->
                <div
                  class="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600 transition group-hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-400">
                  <UIcon name="i-lucide-upload-cloud" class="h-7 w-7" />
                </div>

                <!-- Text -->
                <div>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Click or drag the file here
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    PDF or ZIP (max 50MB)
                  </p>
                </div>

                <!-- Selected file -->
                <div v-if="file"
                  class="mt-3 flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm dark:bg-gray-800">
                  <UIcon :name="file.type === 'application/pdf'
                    ? 'i-lucide-file-text'
                    : 'i-lucide-archive'" class="h-4 w-4 text-primary-600" />

                  <span class="max-w-45 truncate text-sm text-gray-700 dark:text-gray-300">
                    {{ file.name }}
                  </span>

                  <span class="text-xs text-gray-400">
                    {{ (file.size / 1024 / 1024).toFixed(2) }} MB
                  </span>

                  <!-- Remove button -->
                  <UButton icon="i-lucide-x" size="xs" color="error" variant="ghost" class="ml-1"
                    @click.stop="file = null" />
                </div>
              </div>
            </template>
          </UFileUpload>
        </UFormField>

        <!-- Buttons -->
        <div class="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
          <UButton label="Cancel" color="secondary" variant="ghost" type="button" @click="open = false" />
          <UButton label="Create" color="primary" type="submit" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
