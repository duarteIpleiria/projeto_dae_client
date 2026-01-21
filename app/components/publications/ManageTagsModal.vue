<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Publication, Tag } from '~/types'
import { useAuthStore } from '~/stores/auth-store.js'

interface Props {
  modelValue?: boolean
  publication: Publication | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  publication: null
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'tags-updated': [publication: Publication]
}>()

const authStore = useAuthStore()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const { fetchTags, tags: availableTags, loading: loadingTags } = useTags()
const { associateTags, disassociateTags, loading: loadingOperation } = usePublications()
const toast = useToast()

const selectedTagIds = ref<number[]>([])
const currentTags = ref<Tag[]>([])

// Check if user can see hidden tags
const canSeeHiddenTags = computed(() => {
  return authStore.user?.role === 'Administrador' || authStore.user?.role === 'Responsavel'
})

// Load available tags when modal opens
watch(open, async (isOpen) => {
  if (isOpen && props.publication) {
    // Fetch tags with includeHidden parameter for admin users
    await fetchTags(canSeeHiddenTags.value)
    currentTags.value = props.publication.tags || []
  }
})

// Transform tags for USelect - filter out already associated tags and hidden tags (for non-admins)
const tagOptions = computed(() => {
  const currentTagIds = currentTags.value.map(t => t.id)
  return availableTags.value
    .filter(tag => !currentTagIds.includes(tag.id))
    .filter(tag => canSeeHiddenTags.value || tag.visible !== false)
    .map(tag => ({
      value: tag.id,
      label: tag.name
    }))
})

const loading = computed(() => loadingTags.value || loadingOperation.value)

const addTags = async () => {
  if (!props.publication || selectedTagIds.value.length === 0) return

  try {
    const response = await associateTags(props.publication.id, selectedTagIds.value) as Publication

    toast.add({
      title: 'Success',
      description: `${selectedTagIds.value.length} tag${selectedTagIds.value.length > 1 ? 's' : ''} added successfully`,
      color: 'success'
    })

    // Update current tags
    if (response?.tags) {
      currentTags.value = response.tags
      emit('tags-updated', response)
    }

    // Clear selection
    selectedTagIds.value = []
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to add tags',
      color: 'error'
    })
  }
}

const removeTag = async (tagId: number) => {
  if (!props.publication) return

  try {
    const response = await disassociateTags(props.publication.id, [tagId]) as Publication

    toast.add({
      title: 'Success',
      description: 'Tag removed successfully',
      color: 'success'
    })

    // Update current tags
    if (response?.tags) {
      currentTags.value = response.tags
      emit('tags-updated', response)
    }
  } catch (e: any) {
    // Check if it's a permission error
    if (e.status === 403 || e.status === 401) {
      toast.add({
        title: 'Permission Denied',
        description: 'You don\'t have permission to remove tags',
        color: 'error'
      })
    } else {
      toast.add({
        title: 'Error',
        description: e.data?.message || 'Failed to remove tag',
        color: 'error'
      })
    }
  }
}

const closeModal = () => {
  open.value = false
  selectedTagIds.value = []
}
</script>

<template>
  <UModal v-model:open="open" title="Manage Publication Tags">
    <template #body>
      <div v-if="publication" class="space-y-6">
        <!-- Publication Title -->
        <div>
          <h3 class="font-semibold text-lg truncate">{{ publication.title }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            By {{ publication.author.name }}
          </p>
        </div>

        <!-- Current Tags -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Tags
          </h4>
          
          <div v-if="currentTags.length > 0" class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in currentTags"
              :key="tag.id"
              variant="outline"
              class="px-3 py-1.5 flex items-center gap-2"
            >
              <span>{{ tag.name }}</span>
              <UButton
                icon="i-lucide-x"
                size="xs"
                variant="ghost"
                color="neutral"
                :loading="loading"
                @click="removeTag(tag.id)"
                class="hover:text-red-500"
              />
            </UBadge>
          </div>
          
          <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">
            No tags associated with this publication
          </div>
        </div>

        <!-- Add Tags Section -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Add Tags
          </h4>
          
          <div v-if="loadingTags" class="text-sm text-gray-500 dark:text-gray-400">
            Loading available tags...
          </div>
          
          <div v-else-if="tagOptions.length === 0" class="text-sm text-gray-500 dark:text-gray-400 italic">
            All available tags are already associated with this publication
          </div>
          
          <div v-else class="space-y-3">
            <USelect
              v-model="selectedTagIds"
              :items="tagOptions"
              placeholder="Select tags to add..."
              :loading="loadingTags"
              :disabled="loading"
              multiple
              searchable
              class="w-full"
            />
            
            <UButton
              label="Add Selected Tags"
              icon="i-lucide-plus"
              :loading="loading"
              :disabled="selectedTagIds.length === 0 || loading"
              @click="addTags"
              block
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Close"
          variant="outline"
          @click="closeModal"
          :disabled="loading"
        />
      </div>
    </template>
  </UModal>
</template>
