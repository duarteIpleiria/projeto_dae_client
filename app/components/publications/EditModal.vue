<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

interface Publication {
  id: number
  title: string
  scientific_area: string
  summary: string
  is_visible: boolean
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
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  scientific_area: z.string().min(3, 'A área científica é obrigatória'),
  summary: z.string().min(3, 'O resumo deve ter pelo menos 3 caracteres'),
  is_visible: z.boolean()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  title: '',
  scientific_area: '',
  summary: '',
  is_visible: false
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
    state.is_visible = props.publication.visible ?? props.publication.is_visible
    
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
    state.is_visible = false
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
    state.is_visible = newPub.visible ?? newPub.is_visible
    
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
      title: 'Sucesso',
      description: 'Ficheiro removido com sucesso',
      color: 'success'
    })
    
    // Notificar componente pai para recarregar dados
    emit('file-removed')
  } catch (error) {
    console.error('Erro ao remover ficheiro:', error)
    toast.add({
      title: 'Erro',
      description: 'Erro ao remover ficheiro',
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
      throw new Error('Erro ao fazer download')
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
      title: 'Sucesso',
      description: 'Download iniciado',
      color: 'success'
    })
  } catch (error) {
    console.error('Erro ao fazer download:', error)
    toast.add({
      title: 'Erro',
      description: 'Erro ao fazer download do ficheiro',
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
      title: 'Erro',
      description: 'Apenas ficheiros PDF ou ZIP são permitidos',
      color: 'error'
    })
    return
  }

  try {
    await updatePublication(props.publication.id, {
      title: event.data.title,
      scientific_area: event.data.scientific_area,
      summary: event.data.summary,
      is_visible: event.data.is_visible,
      file: file.value || undefined
    })

    toast.add({
      title: 'Sucesso',
      description: `Publicação "${event.data.title}" atualizada com sucesso`,
      color: 'success'
    })

    emit('publication-updated')
    open.value = false
  } catch (e: any) {
    toast.add({
      title: 'Erro',
      description: 'Erro ao atualizar publicação',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Editar Publicação" description="Edite os dados da publicação científica">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">

        <!-- Título -->
        <UFormField label="Título" name="title">
          <UInput v-model="state.title" class="w-full" placeholder="Ex: Modelo CNN para deteção de tumores" />
        </UFormField>

        <!-- Área Científica -->
        <UFormField label="Área Científica" name="scientific_area">
          <USelect 
            v-model="state.scientific_area" 
            class="w-full" 
            placeholder="Selecione a área científica" 
            value-attribute="value"
            :items="[
              { label: 'Data Science', value: 'Data Science' },
              { label: 'Materials Science', value: 'Materials Science' }
            ]" 
          />
        </UFormField>

        <!-- Resumo -->
        <UFormField label="Resumo" name="summary">
          <UTextarea v-model="state.summary" :rows="8" placeholder="Digite o resumo da publicação..." class="w-full" />

          <template #help>
            <span class="text-xs text-gray-400">
              {{ state.summary.length }} caracteres
            </span>
          </template>
        </UFormField>

        <!-- Visibilidade -->
        <UFormField label="Visibilidade" name="is_visible">
          <UCheckbox v-model="state.is_visible" label="Publicação visível" />
        </UFormField>

        <!-- Ficheiro (Opcional) -->
        <UFormField label="Ficheiro (Opcional)" name="file">
          <!-- Arquivo Existente -->
          <div v-if="existingFileName && !file" 
            class="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:bg-gray-800 dark:border-gray-700">
            <UIcon name="i-lucide-file-check" class="h-5 w-5 text-green-600" />
            
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ existingFileName }}
              </p>
              <p class="text-xs text-gray-500">
                Ficheiro atual da publicação
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

          <!-- Upload de Novo Arquivo -->
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
                    {{ existingFileName ? 'Clique para substituir o ficheiro' : 'Clique para adicionar ficheiro (opcional)' }}
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
          <UButton label="Cancelar" color="gray" variant="ghost" type="button" @click="open = false" />
          <UButton label="Atualizar" color="primary" type="submit" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
