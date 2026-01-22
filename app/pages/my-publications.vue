<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'

import { useAuthStore } from '~/stores/auth-store'
import { storeToRefs } from 'pinia'

definePageMeta({
  layout: 'default'
})

const authStore = useAuthStore()
const { user } = storeToRefs(authStore) as any

const {
  publications,
  loading,
  fetchUserPublications,
  togglePublicationVisibility,
  sortPublications,
  searchPublications,
  clearPublications
} = usePublications()

const toast = useToast()

const showAddModal = ref(false)
const showRateModal = ref(false)
const showEditModal = ref(false)
const selectedPublicationForRating = ref<any>(null)
const selectedPublicationForEdit = ref<any>(null)

const searchQuery = ref('')
const selectedFilter = ref<'all' | 'visible' | 'hidden'>('all')
const selectedTag = ref<number | null>(null)

const tags = ref<any[]>([])
const tagsLoading = ref(false)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = computed(() => {
  if (totalItems.value === 0) return 1
  return Math.ceil(totalItems.value / itemsPerPage.value)
})

// ===== CARREGAR TAGS =====
const loadTags = async () => {
  try {
    tagsLoading.value = true
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const token = authStore.token

    console.log('Carregando tags de:', `${api}/tags`)
    const response = await $fetch(`${api}/tags`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }) as any

    console.log('✅ Tags carregadas:', response)
    const allTags = (Array.isArray(response) ? response : (response?.data || []))
    
    // Filtrar tags ocultas para TODOS os usuários (incluindo admin)
    // Tags ocultas só devem aparecer na página de gestão de tags
    tags.value = allTags.filter((tag: any) => {
      console.log('🏷️ Filtrando tag:', tag.name, 'visible:', tag.visible)
      return tag.visible === true || tag.visible === undefined || tag.visible === null
    })
    
    console.log('📋 Tags formatadas (após filtro):', tags.value)
  } catch (error) {
    console.error('❌ Erro ao carregar tags:', error)
  } finally {
    tagsLoading.value = false
  }
}

// ===== CARREGAR PUBLICAÇÕES =====
const loadPublications = async () => {
  try {
    console.log('Carregando publicações com filtros:', {
      page: currentPage.value,
      limit: itemsPerPage.value,
      visibility: selectedFilter.value,
      tag: selectedTag.value
    })

    const isVisibleFilter = selectedFilter.value === 'visible' ? true : selectedFilter.value === 'hidden' ? false : undefined

    const response = await fetchUserPublications({
      page: currentPage.value,
      limit: itemsPerPage.value,
      is_visible: isVisibleFilter,
      tag: selectedTag.value || undefined
    }) as any

    console.log('Resposta completa:', response)

    // Se a API retorna { data: [...], total: X }
    if (response?.total !== undefined) {
      totalItems.value = response.total
    } else if (response?.data && typeof response.data === 'object' && response.data.total !== undefined) {
      totalItems.value = response.data.total
    }

    console.log('Total de itens:', totalItems.value)
  } catch (error) {
    console.error('Erro ao carregar publicações:', error)
    toast.add({
      title: 'Erro',
      description: 'Falha ao carregar publicações',
      color: 'error'
    })
  }
}

// ===== WATCHERS - DEVEM VIR DEPOIS DAS FUNÇÕES =====
watch(selectedFilter, async (newFilter) => {
  console.log('🔔 Filtro de visibilidade mudou para:', newFilter)
  currentPage.value = 1
  await loadPublications()
})

watch(selectedTag, async (newTag) => {
  console.log('🔔 Tag mudou para:', newTag)
  currentPage.value = 1
  await loadPublications()
})


// ===== ALTERAR PÁGINA =====
const handlePageChange = async (page: number) => {
  console.log('🔄 Mudando página para:', page)
  currentPage.value = page
  await loadPublications()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ===== ALTERAR VISIBILIDADE =====
const handleToggleVisibility = async (publicationId: number, newVisibility: boolean) => {
  try {
    await togglePublicationVisibility(publicationId, newVisibility)



    toast.add({
      title: 'Sucesso',
      description: newVisibility ? 'Publicação visível' : 'Publicação oculta',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Erro',
      description: 'Falha ao alterar visibilidade',
      color: 'error'
    })
  }
}

// ===== ABRIR MODAL DE RATING =====
const handleRatePublication = (publication: any) => {
  selectedPublicationForRating.value = publication
  showRateModal.value = true
}

// ===== RATING SUBMETIDO =====
const handleRatingSubmitted = async () => {
  showRateModal.value = false
  selectedPublicationForRating.value = null
  await loadPublications()
}

// ===== ABRIR MODAL DE EDITAR RESUMO =====
const handleEditSummary = (publication: any) => {
  console.log(publication)
  selectedPublicationForEdit.value = publication
  showEditModal.value = true
}

// ===== RESUMO ATUALIZADO =====
const handleEditModal = async () => {
  showEditModal.value = false
  selectedPublicationForEdit.value = null
  await loadPublications()
}

// ===== PUBLICAÇÃO CRIADA COM SUCESSO =====
const handlePublicationCreated = async () => {
  showAddModal.value = false
  toast.add({
    title: 'Sucesso',
    description: 'Publicação criada com sucesso',
    color: 'success'
  })
  await loadPublications()
}

// ===== INICIALIZAR =====
onMounted(() => {
  console.log('Componente montado, carregando publicações e tags...')
  loadTags()
  loadPublications()
})

</script>

<template>
  <UDashboardPanel id="publications">
    <!-- HEADER -->
    <template #header>
      <!-- Navbar -->
      <UDashboardNavbar title="Publicações">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton icon="i-lucide-plus" size="md" @click="showAddModal = true">
            Nova Publicação
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <!-- BODY -->
    <template #body>
      <!-- Filtros -->
      <div class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Visibilidade -->
          <USelect 
            v-model="selectedFilter" 
            :items="[
              { value: 'all', label: 'Todas' },
              { value: 'visible', label: 'Visíveis' },
              { value: 'hidden', label: 'Ocultas' }
            ]" 
            placeholder="Filtrar por visibilidade"
            clearable
          />

          <!-- Tags -->
          <USelect 
            v-model="selectedTag" 
            :items="[
              { value: null, label: 'Todas as tags' },
              ...tags.map(tag => ({ value: tag.id, label: tag.name }))
            ]"
            placeholder="Filtrar por tag"
            :loading="tagsLoading"
            searchable
            clearable
          />
        </div>
      </div>
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-16">
        <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-gray-400" />
      </div>

      <!-- Sem resultados -->
      <div v-else-if="publications.length === 0" class="text-center py-16 text-gray-500">
        <UIcon name="i-lucide-inbox" class="mx-auto text-5xl mb-4" />
        Nenhuma publicação encontrada
      </div>

      <!-- Lista -->
      <div v-else class="space-y-4">
        <PublicationsListItem v-for="publication in publications" :key="publication.id" :publication="publication"
          :current-user-id="user?.id || 0" 
          :show-history="true"
          @toggle-visibility="handleToggleVisibility" @rate="handleRatePublication"
          @edit-summary="handleEditSummary" />
      </div>

      <!-- Paginação -->
      <div class="flex justify-center pt-6">
        <UPagination 
          :default-page="currentPage" 
          :page-count="totalPages" 
          :total="totalItems" 
          size="sm"
          @update:page="handlePageChange"
        />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modais -->
  <PublicationsAddModal v-model="showAddModal" @publication-created="handlePublicationCreated" />

  <PublicationsRateModal v-model="showRateModal" :publication="selectedPublicationForRating" :current-user-id="user?.id || 0"
    @rating-submitted="handleRatingSubmitted" />

  <PublicationsEditModal v-model="showEditModal" :publication="selectedPublicationForEdit"
    @publication-updated="handleEditModal" />
</template>
