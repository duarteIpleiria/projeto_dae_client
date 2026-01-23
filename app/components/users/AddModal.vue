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
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  password: z.string().min(3, 'Password must be at least 3 characters')
})

const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  email: '',
  role: '',
  password: ''
})

const toast = useToast()

const roleOptions = [
  { value: 'Administrator', label: 'Administrator' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Collaborator', label: 'Collaborator' }
]

// Clear variables when modal is closed
watch(open, (value) => {
  if (!value) {
    state.name = ''
    state.email = ''
    state.role = ''
    state.password = ''
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data, error } = await useFetch(`${api}/users`, {
    method: 'POST',
    body: JSON.stringify({
      name: event.data.name,
      email: event.data.email,
      role: event.data.role,
      password: event.data.password
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (error.value) {
    toast.add({
      title: 'Error',
      description: 'There was an error adding the user',
      color: 'error'
    })
    return
  }

  const response = data.value as any
  toast.add({
    title: 'Success',
    description: response?.message || `User "${event.data.name}" created successfully`,
    color: 'success'
  })
  
  emit('created')
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="New user" description="Add a new user to the system">
    <UButton label="New user" icon="i-lucide-plus" />

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" class="w-full" placeholder="User name" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" class="w-full" placeholder="user@example.com" />
        </UFormField>

        <UFormField label="Role" name="role">
          <select 
            v-model="state.role" 
            class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="" disabled>Select a role</option>
            <option value="Administrator">Administrator</option>
            <option value="Manager">Manager</option>
            <option value="Collaborator">Collaborator</option>
          </select>
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput v-model="state.password" type="password" class="w-full" placeholder="Password" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="subtle" type="button" @click="open = false" />
          <UButton label="Create" color="primary" type="submit" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
