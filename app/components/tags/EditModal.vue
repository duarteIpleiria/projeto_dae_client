<script setup lang="ts">
import type { Tag } from '~/types'

const props = defineProps<{
  tag: Tag | null
}>()

const emit = defineEmits<{
  (e: 'updated'): void
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

// Populate form when tag prop is set
watch(
  () => props.tag,
  (tag) => {
    if (!tag) return

    state.name = tag.name
    open.value = true
  }
)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.tag) return

  // TODO: Implement when PUT/PATCH endpoint is available
  // Example implementation:
  /*
  const { data, error } = await useFetch(`${api}/tags/${props.tag.id}`, {
    method: 'PUT', // or 'PATCH'
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
      description: 'There was an error updating the tag',
      color: 'error'
    })
    return
  }

  const response = data.value as any
  toast.add({
    title: 'Success',
    description: response?.message || 'Tag updated successfully',
    color: 'success'
  })
  
  emit('updated')
  open.value = false
  */

  toast.add({
    title: 'Not implemented',
    description: 'Edit functionality will be available when the API endpoint is ready',
    color: 'warning'
  })
}
</script>

<template>
  <UModal v-model:open="open" title="Edit tag" description="Update tag information">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" class="w-full" placeholder="Tag name" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="subtle" type="button" @click="open = false" />
          <UButton label="Update" color="primary" type="submit" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
