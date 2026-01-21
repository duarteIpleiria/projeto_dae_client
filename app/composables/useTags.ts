import type { Tag } from '~/types'

export const useTags = () => {
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const getApiBase = () => useRuntimeConfig().public.apiBase
  const getAuthToken = () => useCookie('auth_token').value

  const fetchTags = async (includeHidden = false) => {
    loading.value = true
    error.value = null

    const api = getApiBase()
    const token = getAuthToken()

    if (!token) {
      error.value = 'Authentication required'
      loading.value = false
      return []
    }

    try {
      const response = await $fetch<Tag[]>(`${api}/tags`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      // Filter out hidden tags unless explicitly requested
      tags.value = includeHidden ? response : response.filter(tag => tag.visible !== false)
      
      return tags.value
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to fetch tags'
      console.error('Error fetching tags:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  const subscribeToTag = async (tagId: number) => {
    loading.value = true
    error.value = null

    const api = getApiBase()
    const token = getAuthToken()

    if (!token) {
      error.value = 'Authentication required'
      loading.value = false
      return false
    }

    try {
      await $fetch(`${api}/tags/${tagId}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      return true
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to subscribe to tag'
      console.error('Error subscribing to tag:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  const unsubscribeFromTag = async (tagId: number) => {
    loading.value = true
    error.value = null

    const api = getApiBase()
    const token = getAuthToken()

    if (!token) {
      error.value = 'Authentication required'
      loading.value = false
      return false
    }

    try {
      await $fetch(`${api}/tags/${tagId}/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      return true
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to unsubscribe from tag'
      console.error('Error unsubscribing from tag:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  const toggleTagVisibility = async (tagId: number, visible: boolean) => {
    loading.value = true
    error.value = null

    const api = getApiBase()
    const token = getAuthToken()

    if (!token) {
      error.value = 'Authentication required'
      loading.value = false
      throw new Error('Authentication required')
    }

    try {
      const response = await $fetch(`${api}/tags/${tagId}/visibility`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: { is_visible: visible }
      })

      // Update local tags array
      const index = tags.value.findIndex(tag => tag.id === tagId)
      if (index !== -1) {
        tags.value[index] = {
          ...tags.value[index],
          visible: visible
        }
      }

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to toggle tag visibility'
      console.error('Error toggling tag visibility:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    tags,
    loading,
    error,
    fetchTags,
    subscribeToTag,
    unsubscribeFromTag,
    toggleTagVisibility
  }
}
