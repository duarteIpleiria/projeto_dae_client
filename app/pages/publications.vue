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
  togglePublicationConfidential,
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

const searchTitle = ref('')
const searchAuthorId = ref('')
const searchScientificArea = ref('')
const searchDateFrom = ref('')
const searchDateTo = ref('')
const selectedFilter = ref<'all' | 'visible' | 'hidden'>('all')
const selectedTag = ref<number | null>(null)
const sortBy = ref<'average_rating' | 'comments_count' | 'ratings_count' | null>(null)
const sortOrder = ref<'asc' | 'desc'>('desc')

const tags = ref<any[]>([])
const tagsLoading = ref(false)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = computed(() => {
  if (totalItems.value === 0) return 1
  return Math.ceil(totalItems.value / itemsPerPage.value)
})

// ===== LOAD TAGS =====
const loadTags = async () => {
  try {
    tagsLoading.value = true
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const token = authStore.token

    console.log('Loading tags from:', `${api}/tags`)
    const response = await $fetch(`${api}/tags`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }) as any

    console.log('✅ Tags loaded:', response)
    const allTags = (Array.isArray(response) ? response : (response?.data || []))
    
    // Filter hidden tags for all users (including admins)
    // Hidden tags should only appear on the tag management page
    tags.value = allTags.filter((tag: any) => {
      console.log('🏷️ Filtering tag:', tag.name, 'visible:', tag.visible)
      return tag.visible === true || tag.visible === undefined || tag.visible === null
    })
    
    console.log('📋 Tags formatted (after filter):', tags.value)
  } catch (error) {
    console.error('❌ Error loading tags:', error)
  } finally {
    tagsLoading.value = false
  }
}

// ===== LOAD PUBLICATIONS =====
const loadPublications = async () => {
  if (!loading.value) {
    loading.value = true
  }
  try {
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const token = authStore.token

    let response: any

    // If there are search criteria, use the search endpoint
    const hasSearchCriteria = (searchTitle.value && searchTitle.value.trim()) || 
                              (searchAuthorId.value && searchAuthorId.value.trim()) || 
                              (searchScientificArea.value && searchScientificArea.value.trim()) || 
                              (searchDateFrom.value && searchDateFrom.value.trim()) || 
                              (searchDateTo.value && searchDateTo.value.trim())
    
    if (hasSearchCriteria) {
      const searchBody: any = {}
      if (searchTitle.value && searchTitle.value.trim()) searchBody.title = searchTitle.value.trim()
      if (searchAuthorId.value && searchAuthorId.value.trim()) {
        const authorIdNum = parseInt(searchAuthorId.value)
        if (!isNaN(authorIdNum)) {
          searchBody.author_id = authorIdNum
        }
      }
      if (searchScientificArea.value && searchScientificArea.value.trim()) searchBody.scientific_area = searchScientificArea.value.trim()
      if (searchDateFrom.value && searchDateFrom.value.trim()) searchBody.date_from = searchDateFrom.value.trim()
      if (searchDateTo.value && searchDateTo.value.trim()) searchBody.date_to = searchDateTo.value.trim()

      console.log('Searching publications:', searchBody)

      response = await $fetch(`${api}/posts/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        },
        body: searchBody
      })
    } else if (sortBy.value) {
      // If sortBy is defined, use sorting
      response = await $fetch(`${api}/posts/sort`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        },
        body: {
          sort_by: sortBy.value,
          order: sortOrder.value
        }
      })
    } else {
      // Fetch without sorting (API default order)
      response = await $fetch(`${api}/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        }
      })
    }

    console.log('Full response:', response)

    // Process data
    let data = Array.isArray(response) ? response : (response?.data || [])
    
    // Normalize publications first
    data = data.map((p: any) => {
      const commentsCount = p?.comments_count ?? p?.commentsCount ?? (Array.isArray(p?.comments) ? p.comments.length : 0)
      const isVisible = p?.isVisible ?? p?.is_visible ?? p?.visible
      const isConfidential = p?.isConfidential ?? p?.is_confidential ?? p?.confidential ?? false
      
      console.log(`📝 Publication ${p.id} (${p.title}):`, {
        raw_isConfidential: p.isConfidential,
        raw_is_confidential: p.is_confidential, 
        raw_confidential: p.confidential,
        normalizado_confidential: isConfidential,
        isVisible: isVisible
      })
      
      return {
        ...p,
        average_rating: p?.average_rating ?? p?.averageRating ?? 0,
        ratings_count: p?.ratings_count ?? p?.ratingsCount ?? 0,
        comments_count: commentsCount,
        is_visible: isVisible,
        is_confidential: isConfidential,
        comments: p?.comments || []
      }
    })
    
    // Log before filters
    if (sortBy.value) {
      console.log(`📊 Backend order (${sortBy.value}):`, data.slice(0, 5).map((p: any) => ({
        id: p.id,
        [sortBy.value]: p[sortBy.value]
      })))
    }
    
    // Apply confidential filter client-side (must come BEFORE visibility filter)
    if (selectedFilter.value === 'confidential') {
      const beforeFilter = data.length
      console.log('🔍 Before confidential filter:', data.map(p => ({ 
        id: p.id, 
        title: p.title, 
        is_confidential: p.is_confidential,
        confidential: p.confidential 
      })))
      
      data = data.filter((p: any) => {
        const isConfidential = p?.is_confidential ?? p?.confidential ?? false
        console.log(`Publication ${p.id}: is_confidential=${p.is_confidential}, confidential=${p.confidential}, result=${isConfidential}`)
        return isConfidential
      })
      
      console.log(`📊 Confidential filter applied: ${beforeFilter} -> ${data.length}`)
      console.log('🔍 After filter:', data.map(p => ({ id: p.id, title: p.title })))
    }
    // Apply visibility filter on the frontend (ONLY if not already filtering by confidential)
    else if (selectedFilter.value !== 'all') {
      data = data.filter((p: any) => {
        const isVisible = p?.is_visible ?? p?.visible ?? false
        return selectedFilter.value === 'visible' ? isVisible : !isVisible
      })
    }
    
    console.log('📊 Total publications after filters:', data.length)

    // Apply tag filter on the frontend
    if (selectedTag.value !== null) {
      data = data.filter((p: any) => {
        const publicationTags = p?.tags || []
        return publicationTags.some((tag: any) => tag.id === selectedTag.value)
      })
    }
    
    publications.value = data

    // Update total
    totalItems.value = publications.value.length

    console.log('Total items:', totalItems.value)
    console.log('Publications loaded:', publications.value.length)
  } catch (error) {
    console.error('Error loading publications:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load publications',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// ===== WATCHERS - SHOULD COME AFTER FUNCTIONS =====
watch(searchTitle, async () => {
  console.log('🔍 Title search:', searchTitle.value)
  currentPage.value = 1
  await loadPublications()
})

watch(searchAuthorId, async () => {
  console.log('🔍 Author ID search:', searchAuthorId.value)
  currentPage.value = 1
  await loadPublications()
})

watch(searchScientificArea, async () => {
  console.log('🔍 Scientific area search:', searchScientificArea.value)
  currentPage.value = 1
  await loadPublications()
})

watch(searchDateFrom, async () => {
  console.log('🔍 From date search:', searchDateFrom.value)
  currentPage.value = 1
  await loadPublications()
})

watch(searchDateTo, async () => {
  console.log('🔍 To date search:', searchDateTo.value)
  currentPage.value = 1
  await loadPublications()
})

watch(selectedFilter, async (newFilter) => {
  console.log('🔔 Visibility filter changed to:', newFilter)
  currentPage.value = 1
  await loadPublications()
})

watch(selectedTag, async (newTag) => {
  console.log('🔔 Tag changed to:', newTag)
  currentPage.value = 1
  await loadPublications()
})

watch(sortBy, async (newSort) => {
  console.log('🔔 Sort changed to:', newSort)
  currentPage.value = 1
  await loadPublications()
})

watch(sortOrder, async (newOrder) => {
  console.log('🔔 Order changed to:', newOrder)
  currentPage.value = 1
  await loadPublications()
})


// ===== CHANGE PAGE =====
const handlePageChange = async (page: number) => {
  console.log('🔄 Changing page to:', page)
  currentPage.value = page
  await loadPublications()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ===== TOGGLE VISIBILITY =====
const handleToggleVisibility = async (publicationId: number, newVisibility: boolean) => {
  try {
    await togglePublicationVisibility(publicationId, newVisibility)
    
    // If filter is 'all', just update the local state without reloading
    if (selectedFilter.value === 'all') {
      const publication = publications.value.find(p => p.id === publicationId)
      if (publication) {
        publication.visible = newVisibility
        publication.is_visible = newVisibility
      }
    } else {
      // For other filters, reload to remove/add from the filtered list
      await loadPublications()
    }

    toast.add({
      title: 'Success',
      description: newVisibility ? 'Publication is now visible' : 'Publication is now hidden',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to change visibility',
      color: 'error'
    })
  }
}

// ===== OPEN RATING MODAL =====
// ===== TOGGLE CONFIDENTIAL =====
const handleToggleConfidential = async (publicationId: number, newConfidential: boolean) => {
  console.log('🔐 handleToggleConfidential called:', { publicationId, newConfidential })
  try {
    await togglePublicationConfidential(publicationId, newConfidential)
    
    // If filter is 'all', just update the local state without reloading
    if (selectedFilter.value === 'all') {
      const publication = publications.value.find(p => p.id === publicationId)
      if (publication) {
        publication.confidential = newConfidential
        publication.is_confidential = newConfidential
      }
    } else {
      // For other filters, reload to remove/add from the filtered list
      await loadPublications()
    }
    
    toast.add({
      title: 'Success',
      description: newConfidential ? 'Publication marked as confidential' : 'Publication marked as not confidential',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error?.data?.error || 'Failed to change confidentiality',
      color: 'error'
    })
  }
}

// ===== ABRIR MODAL DE RATING =====
const handleRatePublication = (publication: any) => {
  selectedPublicationForRating.value = publication
  showRateModal.value = true
}

// ===== RATING SUBMITTED =====
const handleRatingSubmitted = async () => {
  showRateModal.value = false
  selectedPublicationForRating.value = null
  await loadPublications()
}

// ===== OPEN EDIT SUMMARY MODAL =====
const handleEditSummary = (publication: any) => {
  console.log('📝 Publication selected for edit:', publication)
  console.log('📝 Scientific area:', publication.scientific_area)
  console.log('📝 ScientificArea:', publication.scientificArea)
  selectedPublicationForEdit.value = publication
  showEditModal.value = true
}

// ===== SUMMARY UPDATED =====
const handleEditModal = async () => {
  showEditModal.value = false
  selectedPublicationForEdit.value = null
  await loadPublications()
}

// ===== PUBLICATION CREATED SUCCESSFULLY =====
const handlePublicationCreated = async () => {
  showAddModal.value = false
  toast.add({
    title: 'Success',
    description: 'Publication created successfully',
    color: 'success'
  })
  await loadPublications()
}

// ===== COMMENT ADDED =====
const handleCommentAdded = (publicationId: number, comment: any) => {
  console.log('💬 Comment added to publication:', publicationId, comment)
  
  // Find the publication and add the comment to its comments array
  const publication = publications.value.find(p => p.id === publicationId)
  if (publication) {
    if (!publication.comments) {
      publication.comments = []
    }
    publication.comments.push(comment)
    
    // Update comments count
    if (publication.comments_count !== undefined) {
      publication.comments_count++
    } else {
      publication.comments_count = publication.comments.length
    }
  }
}

// ===== INITIALIZE =====
onMounted(async () => {
  console.log('Component mounted, loading publications and tags...')
  await Promise.all([loadTags(), loadPublications()])
})

</script>

<template>
  <UDashboardPanel id="publications">
    <!-- HEADER -->
    <template #header>
      <!-- Navbar -->
      <UDashboardNavbar title="Publications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton icon="i-lucide-plus" size="md" @click="showAddModal = true">
            New Publication
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <!-- BODY -->
    <template #body>      <!-- Search -->
      <div class="mb-6 space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <UIcon name="i-lucide-search" class="w-4 h-4" />
          <span>Search Publications</span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Search by Title -->
          <UInput 
            v-model="searchTitle"
            icon="i-lucide-text"
            placeholder="Search by title..."
            clearable
          />

          <!-- Search by Author ID -->
          <UInput 
            v-model="searchAuthorId"
            icon="i-lucide-user"
            type="number"
            placeholder="Author ID..."
            clearable
          />

          <!-- Search by Scientific Area -->
          <UInput 
            v-model="searchScientificArea"
            icon="i-lucide-flask-conical"
            placeholder="Scientific area..."
            clearable
          />
        </div>

        <!-- Second search row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Date from -->
          <UInput 
            v-model="searchDateFrom"
            type="date"
            icon="i-lucide-calendar"
            placeholder="Start date..."
            clearable
          />

          <!-- Date to -->
          <UInput 
            v-model="searchDateTo"
            type="date"
            icon="i-lucide-calendar"
            placeholder="End date..."
            clearable
          />
        </div>
      </div>
      <!-- Filters -->
      <div class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Visibility -->
          <USelect 
            v-model="selectedFilter" 
            :items="[
              { value: 'all', label: 'All' },
              { value: 'visible', label: 'Visible' },
              { value: 'confidential', label: 'Confidential' },
              { value: 'hidden', label: 'Hidden' }
            ]" 
            placeholder="Filter by visibility"
            clearable
          />

          <!-- Tags -->
          <USelect 
            v-model="selectedTag" 
            :items="[
              { value: null, label: 'All tags' },
              ...tags.map(tag => ({ value: tag.id, label: tag.name }))
            ]"
            placeholder="Filter by tag"
            :loading="tagsLoading"
            searchable
            clearable
          />
        </div>

        <!-- Sorting -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <!-- Order by -->
          <USelect 
            v-model="sortBy" 
            :items="[
              { value: 'average_rating', label: 'Top Rated' },
              { value: 'ratings_count', label: 'Most Rated' },
              { value: 'comments_count', label: 'Most Commented' }
            ]" 
            placeholder="Order by"
          />

          <!-- Order -->
          <USelect 
            v-model="sortOrder" 
            :items="[
              { value: 'desc', label: 'Descending' },
              { value: 'asc', label: 'Ascending' }
            ]" 
            placeholder="Order"
          />
        </div>
      </div>
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-16">
        <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-gray-400" />
      </div>

      <!-- Sem resultados -->
      <div v-else-if="publications.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-500">
        <UIcon name="i-lucide-inbox" class="text-5xl mb-4" />
        <p>No publications found</p>
      </div>

      <!-- Lista -->
      <div v-else class="space-y-4">
        <PublicationsListItem v-for="publication in publications" :key="publication.id" :publication="publication"
          :current-user-id="(user as any)?.id || 0" 
          :show-history="false"
          @toggle-visibility="handleToggleVisibility" 
          @toggle-confidential="handleToggleConfidential"
          @rate="handleRatePublication"
          @edit-summary="handleEditSummary" 
          @comment-added="handleCommentAdded" />
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

  <PublicationsRateModal v-model="showRateModal" :publication="selectedPublicationForRating" :current-user-id="(user as any)?.id || 0"
    @rating-submitted="handleRatingSubmitted" />

  <PublicationsEditModal v-model="showEditModal" :publication="selectedPublicationForEdit"
    @publication-updated="handleEditModal" 
    @file-removed="loadPublications" />
</template>
