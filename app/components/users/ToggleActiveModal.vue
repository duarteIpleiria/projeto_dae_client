<script setup lang="ts">
import type { UserData } from '~/types'

const props = defineProps<{
  user: UserData | null
}>()

const emit = defineEmits<{
  (e: 'toggled'): void
  (e: 'close'): void
}>()

import { useAuthStore } from "~/stores/auth-store.js";

const authStore = useAuthStore();
const token = authStore.token;

const config = useRuntimeConfig()
const api = config.public.apiBase

const toast = useToast()

const open = ref(false)

const isActive = computed(() => props.user?.active !== false)
const actionText = computed(() => isActive.value ? 'desativar' : 'ativar')
const actionTextCapitalized = computed(() => isActive.value ? 'Desativar' : 'Ativar')

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
    // User closed/cancelled without toggling
    emit('close')
  }
})

async function onSubmit() {
  if (!props.user) return

  const newActiveStatus = !isActive.value
  const endpoint = newActiveStatus ? 'activate' : 'deactivate'
  
  console.log('[ToggleActiveModal] Toggling user:', {
    userId: props.user.id,
    currentStatus: isActive.value,
    newStatus: newActiveStatus,
    endpoint: `${api}/users/${props.user.id}/${endpoint}`
  })

  try {
    const response = await $fetch(`${api}/users/${props.user.id}/${endpoint}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('[ToggleActiveModal] Backend response:', response)
    
    toast.add({
      title: 'Sucesso',
      description: `Utilizador ${newActiveStatus ? 'ativado' : 'desativado'} com sucesso`,
      color: 'success'
    })

    open.value = false
    emit('toggled')
  } catch (error: any) {
    console.error('Error toggling user status:', error)
    toast.add({
      title: 'Erro',
      description: 'Ocorreu um erro ao alterar o estado do utilizador',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`${actionTextCapitalized} utilizador`"
    :description="`Tem certeza que deseja ${actionText} o utilizador &quot;${user?.name}&quot;?`"
  >
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          :label="actionTextCapitalized"
          :color="isActive ? 'error' : 'success'"
          variant="solid"
          loading-auto
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
