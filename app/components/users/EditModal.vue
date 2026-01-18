<script setup lang="ts">
import type { UserData } from '~/types'

const props = defineProps<{
  user: UserData | null
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
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required')
})

const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  email: '',
  role: ''
})

const toast = useToast()

// Populate form when user prop is set
watch(
  () => props.user,
  (user) => {
    if (!user) return

    state.name = user.name
    state.email = user.email
    state.role = user.role
    open.value = true
  }
)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.user) return

  // TODO: Implement when PUT/PATCH endpoint is available
  // Example implementation:
  /*
  const { data, error } = await useFetch(`${api}/users/${props.user.email}`, {
    method: 'PUT', // or 'PATCH'
    body: JSON.stringify({
      name: event.data.name,
      email: event.data.email,
      role: event.data.role
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (error.value) {
    toast.add({
      title: 'Error',
      description: 'There was an error updating the user',
      color: 'error'
    })
    return
  }

  const response = data.value as any
  toast.add({
    title: 'Success',
    description: response?.message || 'User updated successfully',
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
  <UModal v-model:open="open" title="Edit user" description="Update user information">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" class="w-full" placeholder="User name" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" class="w-full" placeholder="user@example.com" />
        </UFormField>

        <UFormField label="Role" name="role">
          <UInput v-model="state.role" class="w-full" placeholder="e.g., Administrador, Colaborador" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="subtle" type="button" @click="open = false" />
          <UButton label="Update" color="primary" type="submit" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
