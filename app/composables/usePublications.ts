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
    is_visible: p?.is_visible ?? p?.visible ?? false,
    is_confidential: p?.is_confidential ?? p?.confidential ?? false,
    comments: p?.comments || []
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

      console.log(filters)
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.is_visible !== undefined) params.append('is_visible', filters.is_visible.toString())
      if (filters?.tag) params.append('tag', filters.tag.toString())

      const response = await $fetch(`${api}/users/me/posts${params.toString() ? '?' + params.toString() : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        }
      })

      console.log('Response da API:', response)

      // A API retorna { data: [...], total?: X } ou apenas [...]
      const data = Array.isArray(response) ? response : ((response as any)?.data || [])
      publications.value = Array.isArray(data)
        ? data.map(normalizePublication)
        : []
      
      // Retorna a resposta completa para que a página acesse o total
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
    is_confidential?: boolean
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
      if (data.is_confidential !== undefined) {
        formData.append('is_confidential', data.is_confidential.toString())
      }
      formData.append('file', data.file)

      const response = await $fetch(`${api}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
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

    page?: number
    limit?: number
    isVisible?: boolean
    tag?: number

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
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        },
        body: searchFilters
      })

      console.log('Search response:', response)
      const data = Array.isArray(response) ? response : ((response as any)?.data || [])
      publications.value = Array.isArray(data) ? data.map(normalizePublication) : []
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
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        },
        body: sortParams
      })

      publications.value = Array.isArray(response)
        ? response.map(normalizePublication)
        : ((response as any)?.data && Array.isArray((response as any).data) ? (response as any).data.map(normalizePublication) : [])
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
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        },
        body: JSON.stringify({ visible: visible })
      })

      // Atualizar na lista local
      const index = publications.value.findIndex(p => p.id === postId)
      if (index !== -1) {
        publications.value[index] = normalizePublication({
          ...publications.value[index],
          ...(response || {}),
          is_visible: (response as any)?.is_visible ?? visible,
          visible: (response as any)?.visible ?? visible
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

  // ===== TOGGLE CONFIDENCIAL =====
  const togglePublicationConfidential = async (postId: number, confidential: boolean) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()

      console.log('🔐 Enviando request para:', `${api}/posts/${postId}/confidential`)
      console.log('🔐 Body:', { confidential })

      const response = await $fetch(`${api}/posts/${postId}/confidential`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        },
        body: JSON.stringify({ confidential: confidential })
      })

      console.log('🔐 Resposta do backend:', response)

      // Atualizar na lista local
      const index = publications.value.findIndex(p => p.id === postId)
      if (index !== -1) {
        publications.value[index] = normalizePublication({
          ...publications.value[index],
          ...(response || {}),
          is_confidential: (response as any)?.is_confidential ?? confidential,
          confidential: (response as any)?.confidential ?? confidential
        })
      }

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao alterar confidencialidade'
      console.error('Error toggling confidential:', e)
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
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
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
          average_rating: (response as any)?.average_rating ?? (response as any)?.averageRating ?? publications.value[index].average_rating,
          ratings_count: (response as any)?.ratings_count ?? (response as any)?.ratingsCount ?? publications.value[index].ratings_count
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

  // ===== EDITAR PUBLICAÇÃO =====
  const updatePublication = async (postId: number, data: {
    title?: string
    scientific_area?: string
    summary?: string
    is_visible?: boolean
    file?: File
  }) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()
      const formData = new FormData()

      // Garantir encoding UTF-8 ao adicionar ao FormData usando Blob com charset explícito
      if (data.title) {
        const titleBlob = new Blob([data.title], { type: 'text/plain; charset=UTF-8' })
        formData.append('title', titleBlob, 'title')
      }
      if (data.scientific_area) {
        const areaBlob = new Blob([data.scientific_area], { type: 'text/plain; charset=UTF-8' })
        formData.append('scientific_area', areaBlob, 'scientific_area')
      }
      if (data.summary !== undefined) {
        const summaryBlob = new Blob([data.summary], { type: 'text/plain; charset=UTF-8' })
        formData.append('summary', summaryBlob, 'summary')
      }
      if (data.is_visible !== undefined) {
        const visibleBlob = new Blob([data.is_visible.toString()], { type: 'text/plain; charset=UTF-8' })
        formData.append('is_visible', visibleBlob, 'is_visible')
      }
      if (data.file) formData.append('file', data.file)

      console.log('📤 Enviando PUT para posts/' + postId + ':', {
        title: data.title,
        scientific_area: data.scientific_area,
        summary: data.summary,
        isVisible: data.is_visible,
        hasFile: !!data.file
      })

      let response
      try {
        response = await $fetch(`${api}/posts/${postId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json; charset=UTF-8',
            'Accept-Charset': 'UTF-8'
          },
          body: formData,
          // Adicionar timeout e retry logic
          retry: 0,
          // Garantir que aceita qualquer resposta 2xx como sucesso
          onResponse({ response }) {
            console.log('🔍 Raw response:', {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              ok: response.ok
            })
          }
        })
      } catch (fetchError: any) {
        // Se o erro for de parsing mas a resposta foi 200, considerar sucesso
        if (fetchError.response?.status === 200 || fetchError.response?.ok) {
          console.warn('⚠️ Response was 200 but parsing failed, considering success')
          response = fetchError.response?._data || {}
        } else {
          throw fetchError
        }
      }

      console.log('✅ Response received:', response)

      // Atualizar na lista local
      const index = publications.value.findIndex(p => p.id === postId)
      if (index !== -1) {
        publications.value[index] = normalizePublication(response || data)
      }

      console.log('✅ Publication updated successfully')
      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao atualizar publicação'
      console.error('❌ Error updating publication:', e)
      console.error('❌ Error details:', {
        message: e.message,
        data: e.data,
        status: e.status,
        statusCode: e.statusCode,
        response: e.response,
        cause: e.cause
      })
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
          summary: (response as any)?.summary ?? summary
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

  // ===== ASSOCIAR TAGS =====
  const associateTags = async (postId: number, tagIds: number[]) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()

      const response = await $fetch(`${api}/posts/${postId}/tags`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: { tags: tagIds }
      })

      // Update local publication if it exists in the list
      const index = publications.value.findIndex(p => p.id === postId)
      if (index !== -1 && response) {
        publications.value[index] = normalizePublication(response)
      }

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to associate tags'
      console.error('Error associating tags:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== DESASSOCIAR TAGS =====
  const disassociateTags = async (postId: number, tagIds: number[]) => {
    loading.value = true
    error.value = null

    try {
      const token = getAuthToken()
      const api = getApiBase()

      const response = await $fetch(`${api}/posts/${postId}/tags`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: { tags: tagIds }
      })

      // Update local publication if it exists in the list
      const index = publications.value.findIndex(p => p.id === postId)
      if (index !== -1 && response) {
        publications.value[index] = normalizePublication(response)
      }

      return response
    } catch (e: any) {
      // Check for permission error
      if (e.status === 403 || e.status === 401) {
        error.value = 'You don\'t have permission to remove tags'
      } else {
        error.value = e.data?.message || 'Failed to remove tags'
      }
      console.error('Error disassociating tags:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    publications,
    loading,
    error,
    fetchUserPublications,
    createPublication,
    updatePublication,
    searchPublications,
    sortPublications,
    togglePublicationVisibility,
    togglePublicationConfidential,
    ratePublication,
    updateSummary,
    associateTags,
    disassociateTags,
    clearPublications
  }
}
