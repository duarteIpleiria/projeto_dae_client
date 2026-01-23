<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'

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
const searchAuthorId = ref('ALL_AUTHORS')
const searchTagId = ref('ALL_TAGS')
const searchScientificArea = ref('ALL_AREAS')
const searchDateFrom = ref('')
const searchDateTo = ref('')
const sortBy = ref<'average_rating' | 'comments_count' | 'ratings_count' | null>(null)
const sortOrder = ref<'asc' | 'desc'>('desc')

const tags = ref<any[]>([])
const tagsLoading = ref(false)

const users = ref<any[]>([])
const usersLoading = ref(false)

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

// ===== LOAD USERS =====
const loadUsers = async () => {
  try {
    usersLoading.value = true
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const token = authStore.token

    console.log('Loading users from:', `${api}/users`)
    const response = await $fetch(`${api}/users`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }) as any

    console.log('✅ Users loaded:', response)
    users.value = Array.isArray(response) ? response : (response?.data || [])
    
    console.log('📋 Users formatted:', users.value)
  } catch (error) {
    console.error('❌ Error loading users:', error)
  } finally {
    usersLoading.value = false
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

    // If there are search criteria, use the search endpoint (only for authenticated users)
    const hasSearchCriteria = (searchTitle.value && searchTitle.value.trim()) || 
                              (searchAuthorId.value && searchAuthorId.value.trim() && searchAuthorId.value !== 'ALL_AUTHORS') || 
                              (searchTagId.value && searchTagId.value.trim() && searchTagId.value !== 'ALL_TAGS') ||
                              (searchScientificArea.value && searchScientificArea.value.trim() && searchScientificArea.value !== 'ALL_AREAS') || 
                              (searchDateFrom.value && searchDateFrom.value.trim()) || 
                              (searchDateTo.value && searchDateTo.value.trim())
    
    // Search is only available for authenticated users
    if (hasSearchCriteria && token) {
      const searchBody: any = {}
      
      // Only add non-empty values to avoid sending empty strings
      if (searchTitle.value && searchTitle.value.trim()) {
        searchBody.title = searchTitle.value.trim()
      }
      
      if (searchAuthorId.value && searchAuthorId.value.trim() && searchAuthorId.value !== 'ALL_AUTHORS') {
        const authorIdNum = parseInt(searchAuthorId.value)
        if (!isNaN(authorIdNum)) {
          searchBody.authorId = authorIdNum
        }
      }
      
      if (searchTagId.value && searchTagId.value.trim() && searchTagId.value !== 'ALL_TAGS') {
        const tagIdNum = parseInt(searchTagId.value)
        if (!isNaN(tagIdNum)) {
          // Backend expects an array of tag IDs for the IN clause
          searchBody.tags = [tagIdNum]
          console.log('🏷️ Tag ID being sent:', searchBody.tags)
        }
      }
      
      if (searchScientificArea.value && searchScientificArea.value.trim() && searchScientificArea.value !== 'ALL_AREAS') {
        searchBody.scientificArea = searchScientificArea.value.trim()
      }
      
      if (searchDateFrom.value && searchDateFrom.value.trim()) {
        searchBody.dateFrom = searchDateFrom.value.trim()
      }
      
      if (searchDateTo.value && searchDateTo.value.trim()) {
        searchBody.dateTo = searchDateTo.value.trim()
      }

    console.log('🔍 Search body being sent:', JSON.stringify(searchBody, null, 2))
    console.log('📅 Date filters - From:', searchDateFrom.value, 'To:', searchDateTo.value)

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
      const sortHeaders: Record<string, string> = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json; charset=UTF-8',
        'Accept-Charset': 'UTF-8'
      }
      // Only add Authorization header if user is authenticated
      if (token) {
        sortHeaders.Authorization = `Bearer ${token}`
      }
      response = await $fetch(`${api}/posts/sort`, {
        method: 'POST',
        headers: sortHeaders,
        body: {
          sort_by: sortBy.value,
          order: sortOrder.value
        }
      })
    } else {
      // Fetch without sorting (API default order)
      const headers: Record<string, string> = {
        'Accept': 'application/json; charset=UTF-8',
        'Accept-Charset': 'UTF-8'
      }
      // Only add Authorization header if user is authenticated
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      response = await $fetch(`${api}/posts`, {
        headers
      })
    }

    console.log('Full response:', response)

    // Process data
    let data = Array.isArray(response) ? response : (response?.data || [])
    
    // Normalize publications - API returns camelCase
    data = data.map((p: any) => {
      const commentsCount = p?.commentsCount ?? (Array.isArray(p?.comments) ? p.comments.length : 0)
      const isVisible = p?.visible ?? true
      const isConfidential = p?.confidential ?? false
      
      return {
        ...p,
        average_rating: p?.averageRating ?? 0,
        ratings_count: p?.ratingsCount ?? 0,
        comments_count: commentsCount,
        is_visible: isVisible,
        is_confidential: isConfidential,
        comments: p?.comments || []
      }
    })
    
    publications.value = data
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

// ===== APPLY FILTERS =====
const applyFilters = async () => {
  console.log('🔍 Applying filters')
  currentPage.value = 1
  await loadPublications()
}

// ===== WATCHERS - SHOULD COME AFTER FUNCTIONS =====
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

watch(currentPage, async () => {
  console.log('🔄 Page changed to:', currentPage.value)
  await loadPublications()
})

// Watch for date changes to auto-refresh
watch(searchDateFrom, async (newDateFrom) => {
  console.log('📅 Date from changed to:', newDateFrom)
  currentPage.value = 1
  await loadPublications()
})

watch(searchDateTo, async (newDateTo) => {
  console.log('📅 Date to changed to:', newDateTo)
  currentPage.value = 1
  await loadPublications()
})

// Debounced search function to prevent race conditions
const debouncedSearch = useDebounceFn(async () => {
  console.log('🔍 Debounced search triggered with title:', searchTitle.value)
  currentPage.value = 1
  await loadPublications()
}, 400)

// Watch for title search changes to auto-refresh (with debounce)
watch(searchTitle, (newTitle) => {
  console.log('🔍 Title search changed to:', newTitle)
  debouncedSearch()
})

// ===== CHANGE PAGE =====
const handlePageChange = (page: number) => {
  console.log('🔄 Changing page to:', page)
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ===== TOGGLE VISIBILITY =====
const handleToggleVisibility = async (publicationId: number, newVisibility: boolean) => {
  try {
    await togglePublicationVisibility(publicationId, newVisibility)
    
    // Update the local state without reloading
    const publication = publications.value.find(p => p.id === publicationId)
    if (publication) {
      publication.visible = newVisibility
      publication.is_visible = newVisibility
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
    
    // Update the local state without reloading
    const publication = publications.value.find(p => p.id === publicationId)
    if (publication) {
      publication.confidential = newConfidential
      publication.is_confidential = newConfidential
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
  console.log('Component mounted, loading publications, tags and users...')
  await Promise.all([loadTags(), loadUsers(), loadPublications()])
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
          <UButton v-if="user" icon="i-lucide-plus" size="md" @click="showAddModal = true">
            New Publication
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <!-- BODY -->
    <template #body>      <!-- Search (only for authenticated users) -->
      <div v-if="user" class="mb-6 space-y-4">
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

          <!-- Search by Author -->
          <USelect 
            v-model="searchAuthorId"
            :items="[
              { value: 'ALL_AUTHORS', label: 'All authors' },
              ...users.map(user => ({ value: user.id.toString(), label: user.name }))
            ]"
            icon="i-lucide-user"
            placeholder="Select author"
            :loading="usersLoading"
            searchable
            @change="applyFilters"
          />

          <!-- Search by Tag -->
          <USelect 
            v-model="searchTagId"
            :items="[
              { value: 'ALL_TAGS', label: 'All tags' },
              ...tags.map(tag => ({ value: tag.id.toString(), label: tag.name }))
            ]"
            icon="i-lucide-tag"
            placeholder="Select tag"
            :loading="tagsLoading"
            searchable
            @change="applyFilters"
          />
        </div>

        <!-- Second search row -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Search by Scientific Area -->
          <USelect 
            v-model="searchScientificArea"
            :items="[
              { value: 'ALL_AREAS', label: 'All scientific areas' },
              { value: 'Peer-reviewed scientific articles', label: 'Peer-reviewed scientific articles' },
              { value: 'Conference proceedings', label: 'Conference proceedings' },
              { value: 'Book chapters or scientific books', label: 'Book chapters or scientific books' },
              { value: 'Technical reports', label: 'Technical reports' },
              { value: 'Patents', label: 'Patents' },
              { value: 'Scientific data (datasets)', label: 'Scientific data (datasets)' },
              { value: 'Software (open source)', label: 'Software (open source)' },
              { value: 'AI models', label: 'AI models' },
              { value: 'Databases', label: 'Databases' },
              { value: 'Data Science', label: 'Data Science' },
              { value: 'Materials Science', label: 'Materials Science' },
              { value: 'Master\'s or doctoral theses', label: 'Master\'s or doctoral theses' },
              { value: 'Scientific outreach articles', label: 'Scientific outreach articles' }
            ]"
            icon="i-lucide-flask-conical"
            placeholder="Select scientific area"
            searchable
            @change="applyFilters"
          />

          <!-- Date from -->
          <UInput 
            v-model="searchDateFrom"
            type="date"
            icon="i-lucide-calendar"
            placeholder="Start date..."
            clearable
            @change="applyFilters"
          />

          <!-- Date to -->
          <UInput 
            v-model="searchDateTo"
            type="date"
            icon="i-lucide-calendar"
            placeholder="End date..."
            clearable
            @change="applyFilters"
          />
        </div>
      </div>
      <!-- Sorting -->
      <div class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Order by -->
          <USelect 
            v-model="sortBy" 
            :items="[
              { value: null, label: 'All (default order)' },
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
      <div v-if="publications.length > 0" class="flex flex-col items-center gap-4 pt-6">
        <div class="text-sm text-gray-500">
          Page {{ currentPage }} of {{ totalPages }} ({{ totalItems }} total)
        </div>
        <UPagination 
          v-model="currentPage"
          :total="totalItems"
          :page-count="itemsPerPage"
          size="sm"
          show-first
          show-last
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
