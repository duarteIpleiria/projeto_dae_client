<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface Props {
  modelValue?: boolean
  userId: number | null
  userName: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  userId: null,
  userName: null
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const authStore = useAuthStore()
const config = useRuntimeConfig()
const api = config.public.apiBase
const toast = useToast()

const activities = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const limit = ref(20)
const total = ref(0)

const fetchActivities = async () => {
  if (!props.userId) return

  loading.value = true
  try {
    const response = await $fetch(`${api}/users/${props.userId}/activities`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      params: {
        page: page.value,
        limit: limit.value
      }
    })

    console.log('📊 Response completa:', response)
    activities.value = Array.isArray(response) ? response : (response as any)?.activities || []
    total.value = (response as any)?.total || (response as any)?.total_activities || activities.value.length
    
    console.log('📊 Activities:', activities.value)
    if (activities.value.length > 0) {
      console.log('📊 Primeira atividade:', activities.value[0])
    }
  } catch (error: any) {
    console.error('Error fetching activities:', error)
    toast.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao carregar histórico de atividades',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen && props.userId) {
    page.value = 1
    fetchActivities()
  } else {
    activities.value = []
  }
})

const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    'LOGIN': 'i-lucide-log-in',
    'LOGOUT': 'i-lucide-log-out',
    'CREATE_PUBLICATION': 'i-lucide-file-plus',
    'EDIT_PUBLICATION': 'i-lucide-file-edit',
    'DELETE_PUBLICATION': 'i-lucide-file-minus',
    'RATE_PUBLICATION': 'i-lucide-star',
    'COMMENT': 'i-lucide-message-square',
    'SUBSCRIBE_TAG': 'i-lucide-tag',
    'UNSUBSCRIBE_TAG': 'i-lucide-tag',
    'CREATE_TAG': 'i-lucide-tag',
    'DELETE_TAG': 'i-lucide-trash-2',
    'HIDE_TAG': 'i-lucide-eye-off',
    'SHOW_TAG': 'i-lucide-eye',
    'ASSOCIATE_TAG': 'i-lucide-link',
    'DISSOCIATE_TAG': 'i-lucide-unlink',
    'UPDATE_NAME': 'i-lucide-user-pen',
    'UPDATE_EMAIL': 'i-lucide-mail',
    'UPDATE_PASSWORD': 'i-lucide-key',
    'PASSWORD_RESET_REQUEST': 'i-lucide-key-round',
    'CREATE_USER': 'i-lucide-user-plus',
    'EDIT_USER': 'i-lucide-user-pen',
    'DELETE_USER': 'i-lucide-user-minus',
    'ACTIVATE_USER': 'i-lucide-user-check',
    'DEACTIVATE_USER': 'i-lucide-user-x',
    'CHANGE_USER_ROLE': 'i-lucide-user-cog',
    'ROLE_CHANGED': 'i-lucide-user-cog',
    'ACCOUNT_ACTIVATED': 'i-lucide-user-check',
    'ACCOUNT_DEACTIVATED': 'i-lucide-user-x'
  }
  return icons[type] || 'i-lucide-activity'
}

const getActivityColor = (type: string) => {
  if (type.includes('DELETE') || type.includes('DEACTIVATE') || type.includes('HIDE')) return 'error'
  if (type.includes('CREATE') || type.includes('ACTIVATE') || type.includes('SHOW')) return 'success'
  if (type.includes('EDIT') || type.includes('CHANGE')) return 'warning'
  return 'neutral'
}

const formatDate = (date: string | number | Date) => {
  if (!date) return 'Data desconhecida'
  
  try {
    const dateObj = typeof date === 'number' ? new Date(date) : new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida'
    }
    
    return dateObj.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    console.error('Error formatting date:', date, e)
    return 'Data inválida'
  }
}
</script>

<template>
  <UModal 
    v-model:open="open" 
    :title="`Histórico de Atividades - ${userName}`"
    :description="`Visualizar todas as atividades do utilizador`"
  >
    <template #body>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin size-6" />
        <span class="ml-2">A carregar histórico...</span>
      </div>

      <div v-else-if="activities.length === 0" class="text-center py-8">
        <UIcon name="i-lucide-activity" class="size-12 text-muted mx-auto mb-3" />
        <p class="text-muted">Nenhuma atividade registada</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="flex gap-3 p-3 rounded-lg border border-default hover:bg-muted/50 transition-colors"
        >
          <div class="flex-shrink-0">
            <div :class="[
              'size-10 rounded-full flex items-center justify-center',
              `bg-${getActivityColor(activity.type)}/10`
            ]">
              <UIcon 
                :name="getActivityIcon(activity.type)" 
                :class="`text-${getActivityColor(activity.type)} size-5`"
              />
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <p class="font-medium text-sm">{{ activity.title || activity.description || 'Atividade sem descrição' }}</p>
                <p v-if="activity.details" class="text-xs text-muted mt-1">
                  {{ activity.details }}
                </p>
              </div>
              <UBadge 
                :label="activity.type" 
                :color="getActivityColor(activity.type)"
                variant="soft"
                size="xs"
              />
            </div>
            <p class="text-xs text-muted mt-2">
              <UIcon name="i-lucide-clock" class="size-3" />
              {{ formatDate(activity.date || activity.timestamp) }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="total > limit" class="flex justify-between items-center mt-4 pt-4 border-t border-default">
        <p class="text-sm text-muted">
          Mostrando {{ activities.length }} de {{ total }} atividades
        </p>
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-chevron-left"
            variant="ghost"
            size="xs"
            :disabled="page === 1"
            @click="page--; fetchActivities()"
          />
          <UButton
            icon="i-lucide-chevron-right"
            variant="ghost"
            size="xs"
            :disabled="page * limit >= total"
            @click="page++; fetchActivities()"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          label="Fechar"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>
