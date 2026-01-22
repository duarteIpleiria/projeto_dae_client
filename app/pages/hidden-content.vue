<template>
  <div class="h-full flex flex-col gap-4 p-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Hidden Content</h1>
      <UButton
        v-if="selectedItems.length > 0"
        icon="i-lucide-eye"
        color="primary"
        @click="batchRestore"
        :loading="restoringBatch"
      >
        Restore Selected ({{ selectedItems.length }})
      </UButton>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 items-center flex-wrap">
      <USelect
        v-model="selectedType"
        :items="typeOptions"
        placeholder="Select type"
        class="w-48"
      />
      
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="Search..."
        class="flex-1 min-w-[200px]"
      />
      
      <USelect
        v-model="sortBy"
        :items="sortOptions"
        placeholder="Sort by"
        class="w-40"
      />
      
      <UButton
        :icon="sortOrder === 'desc' ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
        variant="ghost"
        @click="toggleSortOrder"
        :title="sortOrder === 'desc' ? 'Descending' : 'Ascending'"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin" />
    </div>

    <!-- Empty State -->
    <div v-else-if="hiddenItems.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
      <UIcon name="i-lucide-eye-off" class="w-16 h-16 mb-4" />
      <p class="text-lg">No hidden {{ selectedType }} found</p>
      <p v-if="searchQuery" class="text-sm mt-2">Try adjusting your search query</p>
    </div>

    <!-- Content List -->
    <div v-else class="space-y-3 flex-1 overflow-y-auto">
      <!-- Publications -->
      <template v-if="selectedType === 'publications'">
        <UCard v-for="item in hiddenItems" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          <div class="flex items-start gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-lg truncate">{{ item.title }}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">{{ item.scientificArea }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    by {{ item.author?.name }} • {{ formatDate(item.updatedAt || item.createdAt) }}
                  </p>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                  <UButton
                    icon="i-lucide-external-link"
                    variant="ghost"
                    size="sm"
                    :to="`/publications`"
                    title="View in publications"
                  />
                  <UButton
                    icon="i-lucide-eye"
                    variant="ghost"
                    size="sm"
                    :loading="restoringId === item.id"
                    @click="restoreVisibility(item.id, 'publication')"
                    title="Restore visibility"
                  />
                </div>
              </div>
              
              <p v-if="item.summary" class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{{ item.summary }}</p>
              
              <div v-if="item.tags?.length" class="flex gap-1 mt-2 flex-wrap">
                <UBadge v-for="tag in item.tags" :key="tag.id" variant="outline" size="xs">
                  {{ tag.name }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>
      </template>

      <!-- Comments -->
      <template v-if="selectedType === 'comments'">
        <UCard v-for="item in hiddenItems" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          <div class="flex items-start gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                      <span class="text-xs font-semibold text-white">
                        {{ (item.author?.name?.[0] || 'A').toUpperCase() }}
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-500">
                      {{ item.author?.name }} • {{ formatDate(item.createdAt) }}
                    </p>
                  </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                  <UButton
                    icon="i-lucide-external-link"
                    variant="ghost"
                    size="sm"
                    :to="`/publications?id=${item.postId}`"
                    title="View publication"
                  />
                  <UButton
                    icon="i-lucide-eye"
                    variant="ghost"
                    size="sm"
                    :loading="restoringId === item.id"
                    @click="restoreVisibility(item.id, 'comment', item.postId)"
                    title="Restore visibility"
                  />
                </div>
              </div>
              
              <p class="text-sm text-gray-700 dark:text-gray-300">{{ item.comment }}</p>
            </div>
          </div>
        </UCard>
      </template>

      <!-- Tags -->
      <template v-if="selectedType === 'tags'">
        <UCard v-for="item in hiddenItems" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          <div class="flex items-center gap-4">
            <div class="flex-1 flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-lg">{{ item.name }}</h3>
              </div>
              <UButton
                icon="i-lucide-eye"
                variant="ghost"
                size="sm"
                :loading="restoringId === item.id"
                @click="restoreVisibility(item.id, 'tag')"
                title="Restore visibility"
              />
            </div>
          </div>
        </UCard>
      </template>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div class="text-sm text-gray-600 dark:text-gray-400">
        Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }}-{{ Math.min(currentPage * itemsPerPage, totalItems) }} of {{ totalItems }}
      </div>
      <UPagination
        v-model="currentPage"
        :total="totalPages"
        :max="7"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const authStore = useAuthStore()
const config = useRuntimeConfig()
const api = config.public.apiBase
const toast = useToast()

// Role guard
const canAccessHiddenContent = computed(() => {
  return authStore.user?.role === 'Administrador' || authStore.user?.role === 'Responsavel'
})

onMounted(() => {
  if (!canAccessHiddenContent.value) {
    navigateTo('/')
  }
})

// State
const selectedType = ref('publications')
const searchQuery = ref('')
const sortBy = ref('updatedAt')
const sortOrder = ref('desc')
const currentPage = ref(1)
const itemsPerPage = ref(20)
const hiddenItems = ref([])
const totalItems = ref(0)
const loading = ref(false)
const selectedItems = ref([])
const restoringId = ref(null)
const restoringBatch = ref(false)

// Options
const typeOptions = [
  { label: 'Publications', value: 'publications' },
  { label: 'Comments', value: 'comments' },
  { label: 'Tags', value: 'tags' }
]

const sortOptions = computed(() => {
  if (selectedType.value === 'publications') {
    return [
      { label: 'Last Updated', value: 'updatedAt' },
      { label: 'Title', value: 'title' }
    ]
  } else if (selectedType.value === 'comments') {
    return [
      { label: 'Created Date', value: 'createdAt' },
      { label: 'Updated Date', value: 'updatedAt' }
    ]
  } else {
    return [
      { label: 'Name', value: 'name' }
    ]
  }
})

const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

// Fetch data
const fetchHiddenContent = async () => {
  loading.value = true
  selectedItems.value = []
  
  try {
    const params = new URLSearchParams({
      type: selectedType.value,
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      sortBy: sortBy.value,
      order: sortOrder.value
    })
    
    if (searchQuery.value.trim()) {
      params.append('search', searchQuery.value.trim())
    }
    
    const response = await $fetch(`${api}/hidden-content?${params}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    hiddenItems.value = response.data
    totalItems.value = response.total
  } catch (error) {
    console.error('Error fetching hidden content:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load hidden content',
      color: 'red'
    })
    hiddenItems.value = []
    totalItems.value = 0
  } finally {
    loading.value = false
  }
}

// Watch for changes
watch([selectedType, currentPage, sortBy, sortOrder], () => {
  fetchHiddenContent()
})

// Reset to page 1 when type changes
watch(selectedType, () => {
  currentPage.value = 1
  sortBy.value = selectedType.value === 'publications' ? 'updatedAt' : 
                 selectedType.value === 'comments' ? 'createdAt' : 'name'
})

// Debounced search
let searchTimeout: NodeJS.Timeout
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchHiddenContent()
  }, 500)
})

// Toggle sort order
const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

// Restore visibility
const restoreVisibility = async (id: number, type: string, postId?: number) => {
  restoringId.value = id
  
  try {
    let endpoint = ''
    if (type === 'publication') {
      endpoint = `${api}/posts/${id}/visibility`
    } else if (type === 'comment' && postId) {
      endpoint = `${api}/posts/${postId}/comments/${id}/visibility`
    } else if (type === 'tag') {
      endpoint = `${api}/tags/${id}/visibility`
    }
    
    await $fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ visible: true })
    })
    
    toast.add({
      title: 'Success',
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully`,
      color: 'green'
    })
    
    // Refresh list
    await fetchHiddenContent()
  } catch (error) {
    console.error('Error restoring visibility:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to restore visibility',
      color: 'red'
    })
  } finally {
    restoringId.value = null
  }
}

// Batch restore
const batchRestore = async () => {
  if (selectedItems.value.size === 0) return
  
  restoringBatch.value = true
  
  const promises = Array.from(selectedItems.value).map((id: number) => {
    const item = hiddenItems.value.find((i: any) => i.id === id)
    if (selectedType.value === 'publications') {
      return restoreVisibility(id, 'publication')
    } else if (selectedType.value === 'comments') {
      return restoreVisibility(id, 'comment', item?.postId)
    } else {
      return restoreVisibility(id, 'tag')
    }
  })
  
  try {
    await Promise.all(promises)
    toast.add({
      title: 'Success',
      description: `${selectedItems.value.size} items restored successfully`,
      color: 'green'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Some items failed to restore',
      color: 'red'
    })
  } finally {
    restoringBatch.value = false
    selectedItems.value.clear()
    await fetchHiddenContent()
  }
}

// Format date
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Initial load
onMounted(() => {
  if (canAccessHiddenContent.value) {
    fetchHiddenContent()
  }
})
</script>
