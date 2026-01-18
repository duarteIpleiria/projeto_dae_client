<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth-store'
import { storeToRefs } from 'pinia'

definePageMeta({
  layout: 'default'
})

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

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
const showEditSummaryModal = ref(false)
const selectedPublicationForRating = ref<any>(null)
const selectedPublicationForEdit = ref<any>(null)

const searchQuery = ref('')
const selectedFilter = ref<'all' | 'visible' | 'hidden'>('all')
const sortBy = ref<'average_rating' | 'comments_count' | 'ratings_count'>('average_rating')
const sortOrder = ref<'asc' | 'desc'>('desc')

const currentPage = ref(1)
const itemsPerPage = ref(10)


// ===== CARREGAR PUBLICAÇÕES =====
const loadPublications = async () => {
  try {
    await fetchUserPublications({
      page: currentPage.value,
      limit: itemsPerPage.value,
      is_visible: selectedFilter.value === 'all' ? undefined : selectedFilter.value === 'visible'
    })
  } catch (error) {
    toast.add({
      title: 'Erro',
      description: 'Falha ao carregar publicações',
      color: 'error'
    })
  }
}

// ===== ORDENAR =====
const handleSort = async () => {
  try {
    await sortPublications({
      sort_by: sortBy.value,
      order: sortOrder.value
    })
    
    toast.add({
      title: 'Sucesso',
      description: 'Publicações ordenadas',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Erro',
      description: 'Falha ao ordenar publicações',
      color: 'error'
    })
  }
}

// ===== PESQUISAR =====
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    await loadPublications()
    return
  }

  try {
    await searchPublications({
      title: searchQuery.value
    })

    toast.add({
      title: 'Sucesso',
      description: 'Publicações pesquisadas',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Erro',
      description: 'Falha ao pesquisar publicações',
      color: 'error'
    })
  }
}

// ===== ALTERAR VISIBILIDADE =====
const handleToggleVisibility = async (publicationId: number, newVisibility: boolean) => {
  try {
    await togglePublicationVisibility(publicationId, newVisibility)

    await loadPublications()

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
  selectedPublicationForEdit.value = publication
  showEditSummaryModal.value = true
}

// ===== RESUMO ATUALIZADO =====
const handleSummaryUpdated = async () => {
  showEditSummaryModal.value = false
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
  loadPublications()
})
</script>

<template>
  <UDashboardPanel id="publications">
    <template #header>
      <UDashboardNavbar title="Publicações">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            size="md"
            @click="showAddModal = true"
          >
            Nova Publicação
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Filtros e Pesquisa -->
      <UCard class="shadow-sm">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-filter" />
            <span>Filtros e Busca</span>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Pesquisa -->
          <div class="flex gap-2">
            <UInput
              v-model="searchQuery"
              placeholder="Pesquisar por título..."
              icon="i-lucide-search"
              @keyup.enter="handleSearch"
              class="flex-1"
            />
            <UButton
              @click="handleSearch"
              :loading="loading"
            >
              Pesquisar
            </UButton>
          </div>

          <!-- Filtros -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Filtro de Visibilidade -->
            <div>
              <label class="text-sm font-medium">Visibilidade</label>
              <USelect
                v-model="selectedFilter"
                :options="[
                  { value: 'all', label: 'Todas' },
                  { value: 'visible', label: 'Visíveis' },
                  { value: 'hidden', label: 'Ocultas' }
                ]"
                option-attribute="label"
                value-attribute="value"
                @change="loadPublications"
              />
            </div>

            <!-- Ordenar por -->
            <div>
              <label class="text-sm font-medium">Ordenar por</label>
              <USelect
                v-model="sortBy"
                :options="[
                  { value: 'average_rating', label: 'Rating Médio' },
                  { value: 'comments_count', label: 'Comentários' },
                  { value: 'ratings_count', label: 'Número de Ratings' }
                ]"
                option-attribute="label"
                value-attribute="value"
              />
            </div>

            <!-- Ordem -->
            <div>
              <label class="text-sm font-medium">Ordem</label>
              <div class="flex gap-2">
                <USelect
                  v-model="sortOrder"
                  :options="[
                    { value: 'desc', label: 'Descendente' },
                    { value: 'asc', label: 'Ascendente' }
                  ]"
                  option-attribute="label"
                  value-attribute="value"
                  class="flex-1"
                />
                <UButton
                  @click="handleSort"
                  :loading="loading"
                  icon="i-lucide-arrow-up-down"
                />
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Lista de Publicações -->
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader" class="animate-spin text-2xl" />
      </div>

      <div v-else-if="publications.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-inbox" class="mx-auto text-4xl text-gray-400 mb-4" />
        <p class="text-gray-500">Nenhuma publicação encontrada</p>
      </div>

      <div v-else class="space-y-3">
        <PublicationsListItem
          v-for="publication in publications"
          :key="publication.id"
          :publication="publication"
          :current-user-id="user?.id"
          @toggle-visibility="handleToggleVisibility"
          @rate="handleRatePublication"
          @edit-summary="handleEditSummary"
        />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modal de Criar Publicação -->
  <PublicationsAddModal
    v-model="showAddModal"
    @publication-created="handlePublicationCreated"
  />

  <!-- Modal de Rating -->
  <PublicationsRateModal
    v-model="showRateModal"
    :publication="selectedPublicationForRating"
    :current-user-id="user?.id"
    @rating-submitted="handleRatingSubmitted"
  />

  <!-- Modal de Editar Resumo -->
  <PublicationsEditSummaryModal
    v-model="showEditSummaryModal"
    :publication="selectedPublicationForEdit"
    @summary-updated="handleSummaryUpdated"
  />
</template>
