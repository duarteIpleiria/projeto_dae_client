import { ref } from 'vue'

export const usePublications = () => {
  const getApiBase = () => useRuntimeConfig().public.apiBase
  const getAuthToken = () => {
    const token = useCookie('auth_token').value
    if (!token) {
      throw new Error('Auth token not found')
    }
    return token
  }

  const normalizePublication = (p: any) => ({
    ...p,
    average_rating: p?.average_rating ?? p?.averageRating ?? 0,
    ratings_count: p?.ratings_count ?? p?.ratingsCount ?? 0,
    is_visible: p?.is_visible ?? p?.visible ?? false
  })

  const publications = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===== LISTAR PUBLICAÇÕES DO USER =====
  const fetchUserPublications = async (filters?: {
    page?: number
    limit?: number
    is_visible?: boolean
    tag?: number
  }) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()

      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.is_visible !== undefined) params.append('is_visible', filters.is_visible.toString())
      if (filters?.tag) params.append('tag', filters.tag.toString())

      const response = await $fetch(`${api}/users/me/posts${params.toString() ? '?' + params.toString() : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      publications.value = Array.isArray(response)
        ? response.map(normalizePublication)
        : []
      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao carregar publicações'
      console.error('Error fetching user publications:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== CRIAR PUBLICAÇÃO =====
  const createPublication = async (data: {
    title: string
    scientific_area: string
    is_visible: boolean
    file: File
  }) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()
      const formData = new FormData()

      formData.append('title', data.title)
      formData.append('scientific_area', data.scientific_area)
      formData.append('is_visible', data.is_visible.toString())
      formData.append('file', data.file)

      const response = await $fetch(`${api}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao criar publicação'
      console.error('Error creating publication:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== PESQUISAR PUBLICAÇÕES =====
  const searchPublications = async (searchFilters: {
    title?: string
    author_id?: number
    scientific_area?: string
    tags?: number[]
    date_from?: string
    date_to?: string
  }) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()

      const response = await $fetch(`${api}/posts/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: searchFilters
      })

      publications.value = Array.isArray(response)
        ? response.map(normalizePublication)
        : []
      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao pesquisar publicações'
      console.error('Error searching publications:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== ORDENAR PUBLICAÇÕES =====
  const sortPublications = async (sortParams: {
    sort_by: 'average_rating' | 'comments_count' | 'ratings_count'
    order: 'asc' | 'desc'
  }) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()

      const response = await $fetch(`${api}/posts/sort`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: sortParams
      })

      publications.value = Array.isArray(response)
        ? response.map(normalizePublication)
        : []
      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao ordenar publicações'
      console.error('Error sorting publications:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== ALTERAR VISIBILIDADE =====
  const togglePublicationVisibility = async (postId: number, visible: boolean) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()

      const response = await $fetch(`${api}/posts/${postId}/visibility`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: visible
      })

      // Atualizar na lista local
      const index = publications.value.findIndex(p => p.id === postId)
      if (index !== -1) {
        publications.value[index] = normalizePublication({
          ...publications.value[index],
          ...(response || {}),
          is_visible: response?.is_visible ?? visible,
          visible: response?.visible ?? visible
        })
      }

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao alterar visibilidade'
      console.error('Error toggling visibility:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== ATRIBUIR RATING =====
  const ratePublication = async (postId: number, rating: number) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()

      const response = await $fetch(`${api}/posts/${postId}/ratings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          rating
        }
      })

      // Atualizar na lista local
      const index = publications.value.findIndex(p => p.id === postId)
      if (index !== -1) {
        publications.value[index] = normalizePublication({
          ...publications.value[index],
          ...(response || {}),
          average_rating: response?.average_rating ?? response?.averageRating ?? publications.value[index].average_rating,
          ratings_count: response?.ratings_count ?? response?.ratingsCount ?? publications.value[index].ratings_count
        })
      }

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao atribuir rating'
      console.error('Error rating publication:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== EDITAR RESUMO (SUMMARY) =====
  const updateSummary = async (postId: number, summary: string) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()

      const response = await $fetch(`${api}/posts/${postId}/summary`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          summary
        }
      })

      // Atualizar na lista local
      const index = publications.value.findIndex(p => p.id === postId)
      if (index !== -1) {
        publications.value[index] = normalizePublication({
          ...publications.value[index],
          ...(response || {}),
          summary: response?.summary ?? summary
        })
      }

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao atualizar resumo'
      console.error('Error updating summary:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== LIMPAR =====
  const clearPublications = () => {
    publications.value = []
    error.value = null
  }

  return {
    publications,
    loading,
    error,
    fetchUserPublications,
    createPublication,
    searchPublications,
    sortPublications,
    togglePublicationVisibility,
    ratePublication,
    updateSummary,
    clearPublications
  }
}
