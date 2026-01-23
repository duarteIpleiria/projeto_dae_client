<script setup lang="ts">
import type { UserData } from '~/types'
import { z } from 'zod'

const props = defineProps<{
  user: UserData | null
}>()

const emit = defineEmits<{
  (e: 'updated'): void
  (e: 'close'): void
}>()

import { useAuthStore } from "~/stores/auth-store.js";

const authStore = useAuthStore();
const token = authStore.token;

const config = useRuntimeConfig()
const api = config.public.apiBase

const toast = useToast()

const open = ref(false)

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['Collaborator', 'Manager', 'Administrator'], {
    required_error: 'Role is required'
  })
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: '',
  email: '',
  role: 'Collaborator'
})

const roleOptions = [
  'Collaborator',
  'Manager',
  'Administrator'
]

// Populate form when user prop is set
watch(
  () => props.user,
  (user) => {
    if (user) {
      state.name = user.name
      state.email = user.email
      state.role = user.role as any
      open.value = true
    } else {
      open.value = false
    }
  }
)

// Handle modal close
watch(open, (isOpen) => {
  if (!isOpen && props.user) {
    emit('close')
  }
})

async function onSubmit() {
  if (!props.user) return

  const { data, error } = await useFetch(`${api}/users/${props.user.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: state.name,
      email: state.email,
      role: state.role
    })
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
    description: 'User updated successfully',
    color: 'success'
  })

  open.value = false
  emit('updated')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Edit user: ${user?.name}`"
    description="Update user information"
  >
    <template #body>
      <UForm :schema="schema" :state="state" @submit="onSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" placeholder="User name" />
        </UFormField>

        <UFormField label="Email" name="email" required class="mt-4">
          <UInput v-model="state.email" type="email" placeholder="user@example.com" />
        </UFormField>

        <UFormField label="Role" name="role" required class="mt-4">
          <select v-model="state.role" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <option v-for="role in roleOptions" :key="role" :value="role">
              {{ role }}
            </option>
          </select>
        </UFormField>

        <div class="flex justify-end gap-2 mt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Update User"
            color="primary"
            variant="solid"
            type="submit"
            loading-auto
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
