<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth-store'

definePageMeta({
  layout: 'default'
})

const authStore = useAuthStore()
const toast = useToast()

const activities = ref<any[]>([])
const loading = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalActivities = ref(0)
const totalPages = ref(0)

const totalPagesComputed = computed(() => {
  if (totalActivities.value === 0) return 1
  return Math.ceil(totalActivities.value / itemsPerPage.value)
})

// Ícone e cor por tipo de atividade
const getActivityIcon = (type: string) => {
  switch (type) {
    case 'upload':
      return 'i-lucide-upload'
    case 'edit':
      return 'i-lucide-edit'
    case 'tag':
    case 'tag_creation':
    case 'SUBSCRIBE_TAG':
    case 'UNSUBSCRIBE_TAG':
    case 'CREATE_TAG':
      return 'i-lucide-tag'
    case 'delete':
    case 'DELETE_TAG':
      return 'i-lucide-trash'
    case 'HIDE_TAG':
      return 'i-lucide-eye-off'
    case 'SHOW_TAG':
      return 'i-lucide-eye'
    case 'comment':
      return 'i-lucide-message-circle'
    case 'rating':
      return 'i-lucide-star'
    case 'ASSOCIATE_TAG':
      return 'i-lucide-link'
    case 'DISSOCIATE_TAG':
      return 'i-lucide-unlink'
    case 'UPDATE_NAME':
    case 'EDIT_USER':
      return 'i-lucide-user-pen'
    case 'UPDATE_EMAIL':
      return 'i-lucide-mail'
    case 'UPDATE_PASSWORD':
      return 'i-lucide-key'
    case 'PASSWORD_RESET_REQUEST':
      return 'i-lucide-key-round'
    case 'CREATE_USER':
      return 'i-lucide-user-plus'
    case 'DELETE_USER':
      return 'i-lucide-user-minus'
    case 'ACTIVATE_USER':
      return 'i-lucide-user-check'
    case 'DEACTIVATE_USER':
      return 'i-lucide-user-x'
    case 'CHANGE_USER_ROLE':
      return 'i-lucide-user-cog'
    default:
      return 'i-lucide-activity'
  }
}

const getActivityColor = (type: string) => {
  switch (type) {
    case 'upload':
    case 'CREATE_TAG':
    case 'CREATE_USER':
    case 'ACTIVATE_USER':
      return 'green'
    case 'edit':
    case 'ASSOCIATE_TAG':
    case 'SUBSCRIBE_TAG':
    case 'EDIT_USER':
    case 'CHANGE_USER_ROLE':
      return 'blue'
    case 'tag':
    case 'tag_creation':
      return 'purple'
    case 'delete':
    case 'DELETE_TAG':
    case 'DISSOCIATE_TAG':
    case 'UNSUBSCRIBE_TAG':
    case 'DELETE_USER':
    case 'DEACTIVATE_USER':
    case 'HIDE_TAG':
      return 'red'
    case 'SHOW_TAG':
      return 'green'
    case 'comment':
      return 'cyan'
    case 'rating':
      return 'yellow'
    case 'UPDATE_NAME':
    case 'UPDATE_EMAIL':
    case 'UPDATE_PASSWORD':
    case 'PASSWORD_RESET_REQUEST':
      return 'gray'
    default:
      return 'gray'
  }
}

const getActivityLabel = (type: string) => {
  switch (type) {
    case 'upload':
      return 'Upload'
    case 'edit':
      return 'Edição'
    case 'tag':
    case 'tag_creation':
      return 'Tag'
    case 'delete':
      return 'Eliminação'
    case 'comment':
      return 'Comentário'
    case 'rating':
      return 'Avaliação'
    case 'SUBSCRIBE_TAG':
      return 'Subscrição de Tag'
    case 'UNSUBSCRIBE_TAG':
      return 'Cancelamento de Tag'
    case 'CREATE_TAG':
      return 'Criação de Tag'
    case 'DELETE_TAG':
      return 'Eliminação de Tag'
    case 'HIDE_TAG':
      return 'Ocultação de Tag'
    case 'SHOW_TAG':
      return 'Exibição de Tag'
    case 'ASSOCIATE_TAG':
      return 'Associação de Tag'
    case 'DISSOCIATE_TAG':
      return 'Remoção de Tag'
    case 'UPDATE_NAME':
      return 'Atualização de Nome'
    case 'UPDATE_EMAIL':
      return 'Atualização de Email'
    case 'UPDATE_PASSWORD':
      return 'Atualização de Password'
    case 'PASSWORD_RESET_REQUEST':
      return 'Reset de Password'
    case 'CREATE_USER':
      return 'Criação de Utilizador'
    case 'EDIT_USER':
      return 'Edição de Utilizador'
    case 'DELETE_USER':
      return 'Eliminação de Utilizador'
    case 'ACTIVATE_USER':
      return 'Ativação de Utilizador'
    case 'DEACTIVATE_USER':
      return 'Desativação de Utilizador'
    case 'CHANGE_USER_ROLE':
      return 'Alteração de Role'
    default:
      return 'Atividade'
  }
}

// Carregar atividades
const loadActivities = async () => {
  try {
    loading.value = true
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const token = authStore.token

    console.log('Carregando histórico de atividades...', {
      page: currentPage.value,
      limit: itemsPerPage.value
    })

    const response = await $fetch(`${api}/users/me/activity`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: {
        page: currentPage.value,
        limit: itemsPerPage.value
      }
    }) as any

    console.log('Resposta do histórico:', response)

    activities.value = response?.activities || []
    totalActivities.value = response?.total_activities || 0
    totalPages.value = response?.total_pages || 0

    console.log(`✅ ${activities.value.length} atividades carregadas`)
  } catch (error: any) {
    console.error('Erro ao carregar atividades:', error)
    toast.add({
      title: 'Erro',
      description: error?.data?.message || 'Falha ao carregar histórico de atividades',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Mudar página
const handlePageChange = async (page: number) => {
  currentPage.value = page
  await loadActivities()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Formatar data
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Inicializar
onMounted(() => {
  console.log('Componente Activity montado, carregando histórico...')
  loadActivities()
})
</script>

<template>
  <UDashboardPanel id="activity">
    <!-- HEADER -->
    <template #header>
      <UDashboardNavbar title="Histórico de Atividades">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <!-- BODY -->
    <template #body>
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-16">
        <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-gray-400" />
      </div>

      <!-- Sem atividades -->
      <div v-else-if="activities.length === 0" class="text-center py-16 text-gray-500">
        <UIcon name="i-lucide-activity" class="mx-auto text-5xl mb-4" />
        <p class="text-lg font-medium">Nenhuma atividade encontrada</p>
        <p class="text-sm mt-2">O seu histórico de atividades aparecerá aqui</p>
      </div>

      <!-- Lista de atividades -->
      <div v-else class="space-y-3">
        <UCard 
          v-for="activity in activities" 
          :key="activity.id"
          :ui="{ body: 'p-4' }"
        >
          <div class="flex items-start gap-4">
            <!-- Ícone -->
            <div 
              class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              :class="`bg-${getActivityColor(activity.type)}-100 dark:bg-${getActivityColor(activity.type)}-900/20`"
            >
              <UIcon 
                :name="getActivityIcon(activity.type)" 
                class="text-lg"
                :class="`text-${getActivityColor(activity.type)}-600 dark:text-${getActivityColor(activity.type)}-400`"
              />
            </div>

            <!-- Conteúdo -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <UBadge 
                      :color="getActivityColor(activity.type)" 
                      variant="subtle"
                      size="xs"
                    >
                      {{ getActivityLabel(activity.type) }}
                    </UBadge>
                  </div>
                  <h3 class="font-medium text-gray-900 dark:text-gray-100">
                    {{ activity.title || activity.description || 'Atividade sem descrição' }}
                  </h3>
                  <p v-if="activity.details" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {{ activity.details }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ formatDate(activity.date) }}
                  </p>
                </div>

                <!-- ID -->
                <div class="flex-shrink-0 text-xs text-gray-400 dark:text-gray-600">
                  #{{ activity.id }}
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Paginação -->
      <div v-if="activities.length > 0" class="flex justify-center pt-6">
        <UPagination 
          :model-value="currentPage"
          :page-count="totalPagesComputed" 
          :total="totalActivities" 
          size="sm"
          @update:model-value="handlePageChange"
        />
      </div>

      <!-- Info de paginação -->
      <div v-if="activities.length > 0" class="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, totalActivities) }} de {{ totalActivities }} atividades
      </div>
    </template>
  </UDashboardPanel>
</template>
