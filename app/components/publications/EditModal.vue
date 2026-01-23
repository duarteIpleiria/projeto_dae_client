<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

interface Publication {
  id: number
  title: string
  scientific_area: string
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
  'publication-updated': []
  'file-removed': []
}>()

const { updatePublication, loading } = usePublications()
const toast = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const schema = z.object({
  title: z.string().min(3, 'Title must have at least 3 characters'),
  scientific_area: z.string().min(3, 'Scientific area is required'),
  summary: z.string().min(3, 'Summary must have at least 3 characters')
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  title: '',
  scientific_area: '',
  summary: ''
})

const file = ref<File | null>(null)
const existingFileName = ref<string | null>(null)
const existingFileUrl = ref<string | null>(null)
const removingFile = ref(false)
const ALLOWED_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed'
]

/* 👉 PREENCHER QUANDO O MODAL ABRE */
watch(open, (isOpen) => {
  if (isOpen && props.publication) {
    console.log('📝 Preenchendo modal com publicação:', props.publication)
    state.title = props.publication.title
    state.scientific_area = props.publication.scientificArea || props.publication.scientific_area
    state.summary = props.publication.summary
    
    // Preencher arquivo existente
    existingFileName.value = props.publication.fileName || props.publication.filename || null
    existingFileUrl.value = props.publication.fileUrl || null
    
    console.log('✅ Estado preenchido:', state)
    console.log('📎 Arquivo existente:', existingFileName.value)
  }

  if (!isOpen) {
    state.title = ''
    state.scientific_area = ''
    state.summary = ''
    file.value = null
    existingFileName.value = null
    existingFileUrl.value = null
  }
})

/* 👉 TAMBÉM ASSISTIR A MUDANÇAS NA PUBLICAÇÃO */
watch(() => props.publication, (newPub) => {
  if (open.value && newPub) {
    console.log('📝 Publicação mudou enquanto modal aberto:', newPub)
    state.title = newPub.title
    state.scientific_area = newPub.scientificArea || newPub.scientific_area
    state.summary = newPub.summary
    
    // Atualizar arquivo existente
    existingFileName.value = newPub.fileName || newPub.filename || null
    existingFileUrl.value = newPub.fileUrl || null
    
    console.log('✅ Estado atualizado:', state)
  }
}, { immediate: true })

/* 👉 REMOVER ARQUIVO EXISTENTE */
async function removeExistingFile() {
  if (!props.publication || !existingFileName.value) return
  
  try {
    removingFile.value = true
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const authStore = useAuthStore()
    const token = authStore.token

    await $fetch(`${api}/posts/${props.publication.id}/file`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    existingFileName.value = null
    existingFileUrl.value = null

    toast.add({
      title: 'Success',
      description: 'File removed successfully',
      color: 'success'
    })
    
    // Notificar componente pai para recarregar dados
    emit('file-removed')
  } catch (error) {
    console.error('Erro ao remover ficheiro:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to remove file',
      color: 'error'
    })
  } finally {
    removingFile.value = false
  }
}

/* 👉 FAZER DOWNLOAD DO ARQUIVO */
const downloadingFile = ref(false)
async function downloadFile() {
  if (!props.publication || !existingFileUrl.value) return
  
  try {
    downloadingFile.value = true
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const authStore = useAuthStore()
    const token = authStore.token

    const response = await fetch(`${api}/posts/${props.publication.id}/download`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to download file')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = existingFileName.value || 'ficheiro'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.add({
      title: 'Success',
      description: 'Download started',
      color: 'success'
    })
  } catch (error) {
    console.error('Erro ao fazer download:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to download the file',
      color: 'error'
    })
  } finally {
    downloadingFile.value = false
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.publication) return

  console.log('📝 Publication a editar:', props.publication)
  console.log('📝 ID da publicação:', props.publication.id)

  // Validar arquivo se foi selecionado
  if (file.value && !ALLOWED_TYPES.includes(file.value.type)) {
    toast.add({
      title: 'Error',
      description: 'Only PDF or ZIP files are allowed',
      color: 'error'
    })
    return
  }

  try {
    await updatePublication(props.publication.id, {
      title: event.data.title,
      scientific_area: event.data.scientific_area,
      summary: event.data.summary,
      file: file.value || undefined
    })

    toast.add({
      title: 'Success',
      description: `Publication "${event.data.title}" updated successfully`,
      color: 'success'
    })

    emit('publication-updated')
    open.value = false
  } catch (e: any) {
    console.error('❌ Erro completo ao editar publicação:', e)
    console.error('❌ Erro data:', e.data)
    console.error('❌ Erro status:', e.status)
    console.error('❌ Erro statusCode:', e.statusCode)
    console.error('❌ Erro message:', e.message)
    
    const errorMessage = e.data?.message || e.message || 'Failed to update publication'
    toast.add({
      title: 'Error',
      description: errorMessage,
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Edit Publication" description="Edit the scientific publication data">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">

        <!-- Title -->
        <UFormField label="Title" name="title">
          <UInput v-model="state.title" class="w-full" placeholder="e.g., CNN model for tumor detection" />
        </UFormField>

        <!-- Scientific Area -->
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

        <!-- Summary -->
        <UFormField label="Summary" name="summary">
          <UTextarea v-model="state.summary" :rows="8" placeholder="Write the publication summary..." class="w-full" />

          <template #help>
            <span class="text-xs text-gray-400">
              {{ state.summary.length }} characters
            </span>
          </template>
        </UFormField>



        <!-- File (Optional) -->
        <UFormField label="File (Optional)" name="file">
          <!-- Existing File -->
          <div v-if="existingFileName && !file" 
            class="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:bg-gray-800 dark:border-gray-700">
            <UIcon name="i-lucide-file-check" class="h-5 w-5 text-green-600" />
            
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ existingFileName }}
              </p>
              <p class="text-xs text-gray-500">
                Current publication file
              </p>
            </div>

            <div class="flex gap-2">
              <UButton 
                v-if="existingFileUrl"
                icon="i-lucide-download" 
                size="xs" 
                color="primary" 
                variant="ghost"
                :loading="downloadingFile"
                @click="downloadFile"
              />
              <UButton 
                icon="i-lucide-trash-2" 
                size="xs" 
                color="error" 
                variant="ghost"
                :loading="removingFile"
                @click="removeExistingFile"
              />
            </div>
          </div>

          <!-- Upload New File -->
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
                    {{ existingFileName ? 'Click to replace the file' : 'Click to add a file (optional)' }}
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
          <UButton label="Cancel" color="gray" variant="ghost" type="button" @click="open = false" />
          <UButton label="Update" color="primary" type="submit" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
