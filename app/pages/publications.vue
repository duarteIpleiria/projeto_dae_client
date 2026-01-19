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
const showEditModal = ref(false)
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
  try {
    currentPage.value = 1

    await searchPublications({
      title: searchQuery.value || undefined,
      author_id: user?.id || undefined,
      scientific_area: undefined, // liga depois se tiveres filtro
      page: currentPage.value,
      limit: itemsPerPage.value
    })

    toast.add({
      title: 'Sucesso',
      description: 'Pesquisa efetuada',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Erro',
      description: 'Falha ao pesquisar publicações',
      color: 'error'
    })
  }
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

      <!-- Toolbar de Filtros -->
      <UDashboardToolbar>
        <UCard class="w-full">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Pesquisa -->
            <UInput v-model="searchQuery" placeholder="Pesquisar por título..." icon="i-lucide-search"
              @keyup.enter="handleSearch" />

            <!-- Visibilidade -->
            <USelect v-model="selectedFilter" :options="[
              { value: 'all', label: 'Todas' },
              { value: 'visible', label: 'Visíveis' },
              { value: 'hidden', label: 'Ocultas' }
            ]" placeholder="Visibilidade" />

            <!-- Ordenar por -->
            <USelect v-model="sortBy" :options="[
              { value: 'average_rating', label: 'Rating Médio' },
              { value: 'comments_count', label: 'Comentários' },
              { value: 'ratings_count', label: 'Nº de Ratings' }
            ]" placeholder="Ordenar por" />

            <!-- Ordem -->
            <div class="flex gap-2">
              <USelect v-model="sortOrder" :options="[
                { value: 'desc', label: 'Desc' },
                { value: 'asc', label: 'Asc' }
              ]" class="flex-1" />
              <UButton icon="i-lucide-arrow-up-down" variant="ghost" @click="handleSort" />
            </div>
          </div>
        </UCard>
      </UDashboardToolbar>
    </template>

    <!-- BODY -->
    <template #body>
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
          :current-user-id="user?.id" @toggle-visibility="handleToggleVisibility" @rate="handleRatePublication"
          @edit-summary="handleEditSummary" />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modais -->
  <PublicationsAddModal v-model="showAddModal" @publication-created="handlePublicationCreated" />

  <PublicationsRateModal v-model="showRateModal" :publication="selectedPublicationForRating" :current-user-id="user?.id"
    @rating-submitted="handleRatingSubmitted" />

  <PublicationsEditModal v-model="showEditModal" :publication="selectedPublicationForEdit"
   @publication-updated="handleEditModal"

 />
</template>
