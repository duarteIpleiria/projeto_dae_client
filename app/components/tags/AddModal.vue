<script setup lang="ts">
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
  name: z.string().min(2, 'Name must be at least 2 characters')
})

const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: ''
})

const toast = useToast()

// Clear variables when modal is closed
watch(open, (value) => {
  if (!value) {
    state.name = ''
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data, error } = await useFetch(`${api}/tags`, {
    method: 'POST',
    body: JSON.stringify({
      name: event.data.name
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (error.value) {
    toast.add({
      title: 'Error',
      description: 'There was an error adding the tag',
      color: 'error'
    })
    return
  }

  const response = data.value as any
  toast.add({
    title: 'Success',
    description: response?.message || `Tag "${event.data.name}" created successfully`,
    color: 'success'
  })
  
  emit('created')
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="New tag" description="Add a new tag to the database">
    <UButton label="New tag" icon="i-lucide-plus" />

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" class="w-full" placeholder="Tag name" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="subtle" type="button" @click="open = false" />
          <UButton label="Create" color="primary" type="submit" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
