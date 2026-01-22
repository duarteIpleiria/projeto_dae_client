<template>
  <UDashboardPanel
    id="hidden-content"
    :default-size="30"
    :min-size="25"
    :max-size="40"
    resizable
  >
    <UDashboardNavbar title="Hidden Content">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>

      <template #trailing>
        <UBadge :label="totalItems" variant="subtle" />
      </template>
    </UDashboardNavbar>

    <!-- Sidebar List -->
    <div class="flex flex-col h-full">
      <!-- Filters -->
      <div class="p-3 border-b border-default space-y-2">
        <div class="flex gap-2">
          <USelect
            v-model="selectedType"
            :items="typeOptions"
            placeholder="Select type"
            size="sm"
            class="flex-1"
          />
          
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search..."
            size="sm"
            class="flex-1"
          />
        </div>
        
        <div class="flex gap-2">
          <USelect
            v-model="sortBy"
            :items="sortOptions"
            placeholder="Sort by"
            size="sm"
            class="flex-1"
          />
          
          <UButton
            :icon="sortOrder === 'desc' ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
            variant="ghost"
            size="sm"
            @click="toggleSortOrder"
            :title="sortOrder === 'desc' ? 'Descending' : 'Ascending'"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex justify-center items-center">
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2" />
          <p class="text-sm text-muted">Loading...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="hiddenItems.length === 0" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <UIcon name="i-lucide-eye-off" class="w-12 h-12 mb-4 text-muted" />
        <p class="text-sm text-muted">No hidden {{ selectedType === 'all' ? 'content' : selectedType }} found</p>
        <p v-if="searchQuery" class="text-xs text-muted mt-2">Try adjusting your search query</p>
      </div>

      <!-- Content List -->
      <div v-else class="flex-1 overflow-y-auto divide-y divide-default">
        <div
          v-for="item in hiddenItems"
          :key="`${getItemType(item)}-${item.id}`"
          :class="[
            'p-4 hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-3',
            selectedItemViewId?.id === item.id && selectedItemViewId?.type === getItemType(item) && 'bg-muted'
          ]"
          @click="selectedItemViewId = { id: item.id, type: getItemType(item) }"
        >
          <!-- Type Indicator Dot -->
          <div 
            :class="[
              'w-3 h-3 rounded-full mt-1.5 flex-shrink-0',
              getItemType(item) === 'publications' && 'bg-blue-500',
              getItemType(item) === 'comments' && 'bg-green-500',
              getItemType(item) === 'tags' && 'bg-amber-500'
            ]"
            :title="getItemType(item)"
          ></div>

          <!-- Item Content -->
          <div class="flex-1 min-w-0">
            <!-- Publication -->
            <template v-if="getItemType(item) === 'publications'">
              <h3 class="font-medium text-sm truncate mb-1">{{ item.title }}</h3>
              <p class="text-xs text-muted truncate">{{ item.scientificArea }}</p>
              <p class="text-xs text-muted mt-1">{{ formatDate(item.updatedAt || item.createdAt) }}</p>
            </template>

            <!-- Comment -->
            <template v-else-if="getItemType(item) === 'comments'">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                  <span class="text-xs font-semibold text-white">
                    {{ (item.author?.name?.[0] || 'A').toUpperCase() }}
                  </span>
                </div>
                <p class="text-xs text-muted truncate">{{ item.author?.name }}</p>
              </div>
              <p class="text-sm line-clamp-2">{{ item.comment }}</p>
              <p class="text-xs text-muted mt-1">{{ formatDate(item.createdAt) }}</p>
            </template>

            <!-- Tag -->
            <template v-else-if="getItemType(item) === 'tags'">
              <h3 class="font-medium text-sm">{{ item.name }}</h3>
            </template>
          </div>
        </div>
      </div>
    </div>
  </UDashboardPanel>

  <!-- Detail View -->
  <div v-if="selectedItemForView" class="flex-1 flex flex-col">
    <UDashboardNavbar 
      :title="selectedItemForView._type === 'tags' ? selectedItemForView.name : (selectedItemForView.title || 'Comment Details')"
    >
      <template #right>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="selectedItemViewId = null"
        />
      </template>
    </UDashboardNavbar>

    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-3xl mx-auto space-y-6">
        <!-- Publication Details -->
        <template v-if="getItemType(selectedItemForView) === 'publications'">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-4 h-4 rounded-full bg-blue-500"></div>
            <UBadge label="Publication" color="blue" variant="soft" />
          </div>

          <UCard>
            <template #header>
              <h3 class="font-semibold text-lg">{{ selectedItemForView.title }}</h3>
            </template>

            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-muted">Scientific Area</label>
                <p class="text-sm">{{ selectedItemForView.scientificArea }}</p>
              </div>

              <UDivider />

              <div>
                <label class="text-sm font-medium text-muted">Author</label>
                <p class="text-sm">{{ selectedItemForView.author?.name || 'Unknown' }}</p>
              </div>

              <UDivider />

              <div v-if="selectedItemForView.summary">
                <label class="text-sm font-medium text-muted">Summary</label>
                <p class="text-sm">{{ selectedItemForView.summary }}</p>
              </div>

              <UDivider v-if="selectedItemForView.summary" />

              <div v-if="selectedItemForView.tags?.length">
                <label class="text-sm font-medium text-muted">Tags</label>
                <div class="flex gap-1 mt-2 flex-wrap">
                  <UBadge v-for="tag in selectedItemForView.tags" :key="tag.id" variant="outline" size="xs">
                    {{ tag.name }}
                  </UBadge>
                </div>
              </div>

              <UDivider v-if="selectedItemForView.tags?.length" />

              <div>
                <label class="text-sm font-medium text-muted">Created</label>
                <p class="text-sm">{{ formatDate(selectedItemForView.createdAt) }}</p>
              </div>

              <UDivider />

              <div>
                <label class="text-sm font-medium text-muted">Last Updated</label>
                <p class="text-sm">{{ formatDate(selectedItemForView.updatedAt) }}</p>
              </div>
            </div>
          </UCard>

          <div class="flex gap-3">
            <UButton
              icon="i-lucide-eye"
              color="primary"
              :loading="restoringId === selectedItemForView.id"
              @click="restoreVisibility(selectedItemForView.id, 'publication')"
            >
              Restore Visibility
            </UButton>
            <UButton
              icon="i-lucide-external-link"
              variant="outline"
              :to="`/publications`"
            >
              View in Publications
            </UButton>
          </div>
        </template>

        <!-- Comment Details -->
        <template v-else-if="getItemType(selectedItemForView) === 'comments'">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-4 h-4 rounded-full bg-green-500"></div>
            <UBadge label="Comment" color="green" variant="soft" />
          </div>

          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                  <span class="text-sm font-semibold text-white">
                    {{ (selectedItemForView.author?.name?.[0] || 'A').toUpperCase() }}
                  </span>
                </div>
                <div>
                  <h3 class="font-semibold">{{ selectedItemForView.author?.name || 'Unknown' }}</h3>
                  <p class="text-xs text-muted">{{ formatDate(selectedItemForView.createdAt) }}</p>
                </div>
              </div>
            </template>

            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-muted">Comment</label>
                <p class="text-sm mt-2">{{ selectedItemForView.comment }}</p>
              </div>

              <UDivider />

              <div>
                <label class="text-sm font-medium text-muted">Last Updated</label>
                <p class="text-sm">{{ formatDate(selectedItemForView.updatedAt) }}</p>
              </div>
            </div>
          </UCard>

          <div class="flex gap-3">
            <UButton
              icon="i-lucide-eye"
              color="primary"
              :loading="restoringId === selectedItemForView.id"
              @click="restoreVisibility(selectedItemForView.id, 'comment', selectedItemForView.postId)"
            >
              Restore Visibility
            </UButton>
            <UButton
              icon="i-lucide-external-link"
              variant="outline"
              :to="`/publications?id=${selectedItemForView.postId}`"
            >
              View Publication
            </UButton>
          </div>
        </template>

        <!-- Tag Details -->
        <template v-else-if="getItemType(selectedItemForView) === 'tags'">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-4 h-4 rounded-full bg-amber-500"></div>
            <UBadge label="Tag" color="amber" variant="soft" />
          </div>

          <UCard>
            <template #header>
              <h3 class="font-semibold text-lg">{{ selectedItemForView.name }}</h3>
            </template>

            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-muted">Tag ID</label>
                <p class="text-sm">{{ selectedItemForView.id }}</p>
              </div>
            </div>
          </UCard>

          <UButton
            icon="i-lucide-eye"
            color="primary"
            :loading="restoringId === selectedItemForView.id"
            @click="restoreVisibility(selectedItemForView.id, 'tag')"
          >
            Restore Visibility
          </UButton>
        </template>
      </div>
    </div>
  </div>

  <!-- Empty state when no item selected -->
  <div v-else class="flex-1 flex flex-col items-center justify-center p-8 text-center">
    <UIcon name="i-lucide-mouse-pointer-click" class="w-16 h-16 mb-4 text-muted" />
    <p class="text-lg font-medium">Select an item to view details</p>
    <p class="text-sm text-muted mt-2">Click on any hidden content item to see more information</p>
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
const selectedItemViewId = ref<{id: number, type: string} | null>(null)

// Computed property for selected item details
const selectedItemForView = computed(() => {
  if (!selectedItemViewId.value) return null
  return hiddenItems.value.find((item: any) => {
    const itemType = item._type || selectedType.value
    return item.id === selectedItemViewId.value.id && itemType === selectedItemViewId.value.type
  }) || null
})

// Get item type (works for both 'all' view and specific type views)
const getItemType = (item: any) => {
  return item._type || selectedType.value
}

// Options
const typeOptions = [
  { label: 'All', value: 'all' },
  { label: 'Publications', value: 'publications' },
  { label: 'Comments', value: 'comments' },
  { label: 'Tags', value: 'tags' }
]

const sortOptions = computed(() => {
  if (selectedType.value === 'all') {
    return [
      { label: 'Last Updated', value: 'updatedAt' }
    ]
  } else if (selectedType.value === 'publications') {
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
    if (selectedType.value === 'all') {
      // Fetch all types
      const types = ['publications', 'comments', 'tags']
      const promises = types.map(type => {
        const params = new URLSearchParams({
          type,
          page: '1',
          limit: '100',
          sortBy: sortBy.value,
          order: sortOrder.value
        })
        
        if (searchQuery.value.trim()) {
          params.append('search', searchQuery.value.trim())
        }
        
        return $fetch(`${api}/hidden-content?${params}`, {
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        }).then(res => ({ type, data: res.data.map(item => ({ ...item, _type: type })) }))
      })
      
      const results = await Promise.all(promises)
      const allItems = results.flatMap(r => r.data)
      
      // Sort combined results
      allItems.sort((a, b) => {
        const aVal = a[sortBy.value]
        const bVal = b[sortBy.value]
        if (sortOrder.value === 'desc') {
          return bVal > aVal ? 1 : -1
        } else {
          return aVal > bVal ? 1 : -1
        }
      })
      
      hiddenItems.value = allItems
      totalItems.value = allItems.length
    } else {
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
    }
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
  sortBy.value = selectedType.value === 'all' ? 'updatedAt' :
                 selectedType.value === 'publications' ? 'updatedAt' : 
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
