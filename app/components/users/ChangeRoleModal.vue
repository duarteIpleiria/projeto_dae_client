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
const isSubmitting = ref(false)

const schema = z.object({
  role: z.enum(['Collaborator', 'Manager', 'Administrator'], {
    required_error: 'Role is required'
  })
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  role: 'Collaborator'
})

const roleOptions = [
  { value: 'Collaborator', label: 'Collaborator' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Administrator', label: 'Administrator' }
]

// Open modal when user is set
watch(
  () => props.user,
  (user) => {
    if (user) {
      // Set current role as default
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
    // User closed/cancelled without updating
    emit('close')
  }
})

async function onSubmit() {
  if (!props.user || isSubmitting.value) return

  // Check if role actually changed
  if (state.role === props.user.role) {
    toast.add({
      title: 'No changes',
      description: 'The role is already set to this value',
      color: 'warning',
      icon: 'i-lucide-info'
    })
    open.value = false
    emit('close')
    return
  }

  isSubmitting.value = true

  try {
    const updatedUser = await $fetch(`${api}/users/${props.user.id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: {
        role: state.role
      }
    })

    console.log('[ChangeRoleModal] Role updated successfully:', updatedUser)

    toast.add({
      title: 'Success',
      description: `Role updated to ${state.role} successfully`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })

    open.value = false
    emit('updated')
  } catch (error: any) {
    console.error('[ChangeRoleModal] Error updating role:', error)
    
    const errorMessage = error?.data?.message || error?.message || 'There was an error updating the role'
    
    toast.add({
      title: 'Error',
      description: errorMessage,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Change role for ${user?.name}`"
    description="Select the new role for this user"
  >
    <template #body>
      <UForm :schema="schema" :state="state" @submit="onSubmit">
        <UFormField label="Role" name="role" required>
          <USelect
            v-model="state.role"
            :items="roleOptions"
            option-attribute="label"
            value-attribute="value"
            placeholder="Select a role"
          />
        </UFormField>

        <div class="flex justify-end gap-2 mt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="isSubmitting"
            @click="open = false"
          />
          <UButton
            label="Update Role"
            color="primary"
            variant="solid"
            type="submit"
            :loading="isSubmitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
