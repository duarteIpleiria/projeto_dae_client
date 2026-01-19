<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

interface Publication {
  id: number
  title: string
  scientificArea: string
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
}>()

const { updateSummary } = usePublications()
const toast = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const schema = z.object({
  title: z.string().min(3),
  scientificArea: z.string().min(3),
  summary: z.string().min(3),
  is_visible: z.boolean()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  title: '',
  scientificArea: '',
  summary: '',
  is_visible: false
})

const submitting = ref(false)

/* 👉 PREENCHER QUANDO O MODAL ABRE */
watch(open, (isOpen) => {
  if (isOpen && props.publication) {
    state.title = props.publication.title
    state.scientificArea = props.publication.scientificArea
    state.summary = props.publication.summary
    state.is_visible = props.publication.is_visible
  }

  if (!isOpen) {
    state.title = ''
    state.scientificArea = ''
    state.summary = ''
    state.is_visible = false
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.publication) return

  try {
    submitting.value = true

    await updatePublication(props.publication.id, {
      title: event.data.title,
      scientificArea: event.data.scientificArea,
      summary: event.data.summary,
      is_visible: event.data.is_visible
    })

    toast.add({
      title: 'Sucesso',
      description: 'Publicação atualizada com sucesso',
      color: 'success'
    })

    emit('publication-updated')
    open.value = false
  } catch {
    toast.add({
      title: 'Erro',
      description: 'Erro ao atualizar publicação',
      color: 'error'
    })
  } finally {
    submitting.value = false
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
        <UFormField label="Scientific Area" name="scientificArea">
          <USelect v-model="state.scientificArea" class="w-full" placeholder="Scientific Area" :items="[
            { label: 'Data Science', value: 'Data Science' },
            { label: 'Materials Science', value: 'Materials Science' }
          ]" />

        </UFormField>


        <UFormField label="Resumo" class="w-full">
          <UTextarea v-model="state.summary" :rows="8" placeholder="Digite o resumo da publicação..." class="w-full" />

          <template #help>
            <span class="text-xs text-gray-400">
              {{ state.summary.length }} caracteres
            </span>
          </template>
        </UFormField>



        <UFormField label="Visibilidade" name="is_visible">
          <UCheckbox v-model="state.is_visible" label="Publicação visível" />
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
