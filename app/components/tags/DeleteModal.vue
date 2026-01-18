<script setup lang="ts">
import type { Tag } from '~/types'

const props = defineProps<{
  tag: Tag | null
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

// Open modal when tag is set
watch(
  () => props.tag,
  (tag) => {
    if (tag) {
      open.value = true
    } else {
      open.value = false
    }
  }
)

// Handle modal close
watch(open, (isOpen) => {
  if (!isOpen && props.tag) {
    // User closed/cancelled without deleting
    emit('close')
  }
})

async function onSubmit() {
  if (!props.tag) return

  const { data, error } = await useFetch(`${api}/tags/${props.tag.id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (error.value) {
    toast.add({
      title: 'Error',
      description: 'There was an error deleting the tag',
      color: 'error'
    })
    return
  }

  const response = data.value as any
  toast.add({
    title: 'Success',
    description: response?.message || 'Tag deleted successfully',
    color: 'success'
  })

  open.value = false
  emit('deleted')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Delete tag`"
    :description="`Are you sure you want to delete &quot;${tag?.name}&quot;? This action cannot be undone.`"
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
