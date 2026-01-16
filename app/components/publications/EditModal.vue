<script setup lang="ts">

import type { Publication } from '~/types'

const props = defineProps<{
  publication: Publication | null
}>()

const open = ref(false)

const emit = defineEmits<{
  (e: 'created'): void
}>()
import { useAuthStore } from "~/stores/auth-store.js";

const authStore = useAuthStore();
const token = authStore.token;

const config = useRuntimeConfig()
const api = config.public.apiBase

import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
const schema = z.object({
  title: z.string().min(2, 'Too short'),
  scientificArea: z.enum(
    ['Data Science', 'Materials Science'],
    { message: 'Scientific Area is required' }
  )
})


type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  title: '',
  scientificArea: undefined
})

const toast = useToast()



watch(
  () => props.publication,
  (pub) => {
    if (!pub) return

    state.title = pub.title
    state.scientificArea = undefined
    file.value = null
    open.value = true
  }
)


const file = ref<File | null>(null)
const ALLOWED_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed'
]

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

  const formData = new FormData()
  formData.append('title', event.data.title)
  formData.append('scientific_area', event.data.scientificArea)
  formData.append('file', file.value)

  const { data, error, status } = await useFetch(`${api}/posts`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (error.value) {
    toast.add({
      title: 'Error',
      description: 'There was an error adding the publication',
      color: 'error'
    })
    return
  }

  toast.add({
    title: 'Success',
    description: `New publication ${event.data.title} added`,
    color: 'success'
  })
  emit('created')
  open.value = false

}
</script>

<template>
  <UModal v-model:open="open" title="Edit publication" description="Edit publication details">
    
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Title" name="title">
          <UInput v-model="state.title" class="w-full" placeholder="Title" />
        </UFormField>

        <UFormField label="Scientific Area" name="scientificArea">
          <USelect v-model="state.scientificArea" class="w-full" placeholder="Scientific Area" :items="[
            { label: 'Data Science', value: 'Data Science' },
            { label: 'Materials Science', value: 'Materials Science' }
          ]" />

        </UFormField>
        <UFormField label="File" name="file">
          <UFileUpload v-model="file" accept=".pdf,.zip" :multiple="false">
            <template #default="{ open }">
              <div
                class="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center transition hover:border-primary-500 hover:bg-primary-50"
                @click="open()">
                <!-- Ícone -->
                <div
                  class="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600 transition group-hover:bg-primary-200">
                  <UIcon name="i-lucide-upload-cloud" class="h-7 w-7" />
                </div>

                <!-- Texto -->
                <div>
                  <p class="text-sm font-medium text-gray-700">
                    Drag & drop your file here
                  </p>
                  <p class="text-xs text-gray-500">
                    or click to browse (PDF or ZIP)
                  </p>
                </div>

                <!-- Ficheiro selecionado -->
                <div v-if="file" class="mt-3 flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm">
                  <UIcon :name="file.type === 'application/pdf'
                    ? 'i-lucide-file-text'
                    : 'i-lucide-archive'" class="h-4 w-4 text-primary-600" />

                  <span class="max-w-[180px] truncate text-sm text-gray-700">
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


        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="subtle" type="button" @click="open = false" />
          <UButton label="Create" color="primary" type="submit" />
        </div>
      </UForm>

    </template>
  </UModal>
</template>
