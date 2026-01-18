<script setup lang="ts">
import type { UserData } from '~/types'

const props = defineProps<{
  user: UserData | null
}>()

const emit = defineEmits<{
  (e: 'deleted'): void
  (e: 'close'): void
}>()

import { useAuthStore } from "~/stores/auth-store.js";

const authStore = useAuthStore();
const token = authStore.token;

const config = useRuntimeConfig()
const api = config.public.apiBase

const toast = useToast()

const open = ref(false)

// Open modal when user is set
watch(
  () => props.user,
  (user) => {
    if (user) {
      open.value = true
    } else {
      open.value = false
    }
  }
)

// Handle modal close
watch(open, (isOpen) => {
  if (!isOpen && props.user) {
    // User closed/cancelled without deleting
    emit('close')
  }
})

async function onSubmit() {
  if (!props.user) return

  const { data, error } = await useFetch(`${api}/users/${props.user.id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (error.value) {
    toast.add({
      title: 'Error',
      description: 'There was an error deleting the user',
      color: 'error'
    })
    return
  }

  const response = data.value as any
  toast.add({
    title: 'Success',
    description: response?.message || 'User deleted successfully',
    color: 'success'
  })

  open.value = false
  emit('deleted')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Delete user`"
    :description="`Are you sure you want to delete &quot;${user?.name}&quot;? This action cannot be undone.`"
  >
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          variant="solid"
          loading-auto
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
