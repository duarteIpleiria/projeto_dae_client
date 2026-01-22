import { ref } from 'vue'

export const useUser = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===== EDITAR DADOS PESSOAIS =====
  const updateProfile = async (data: {
    name?: string
    email?: string
  }) => {
    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const api = config.public.apiBase
      const token = useCookie('auth_token').value

      const response = await $fetch(`${api}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: data
      })

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao atualizar perfil'
      console.error('Error updating profile:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== RECUPERAR PASSWORD =====
  const forgotPassword = async (email: string) => {
    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const api = config.public.apiBase

      const response = await $fetch(`${api}/users/password/forgot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          email
        }
      })

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao enviar email de recuperação'
      console.error('Error requesting password reset:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== OBTER DADOS DO UTILIZADOR =====
  const getCurrentUser = async () => {
    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const api = config.public.apiBase
      const tokenCookie = useCookie('auth_token')
      const authStore = useAuthStore()

      const bearer = tokenCookie.value || authStore.token
      if (!bearer) {
        throw new Error('No token found')
      }

      const response = await $fetch(`${api}/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json'
        }
      })

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Erro ao carregar dados do utilizador'
      console.error('Error fetching current user:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ===== TOGGLE USER ACTIVE STATUS (EP25) =====
  const toggleUserActive = async (userId: number, active: boolean) => {
    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const api = config.public.apiBase
      const token = useCookie('auth_token').value

      if (!token) {
        error.value = 'Authentication required'
        loading.value = false
        throw new Error('Authentication required')
      }

      const response = await $fetch(`${api}/users/${userId}/active`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: { active: active }
      })

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to update user status'
      console.error('[useUser] Error toggling user active status:', {
        userId,
        active,
        status: e.status,
        statusText: e.statusText,
        message: e.data?.message,
        error: e
      })
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    updateProfile,
    forgotPassword,
    getCurrentUser,
    toggleUserActive
  }
}
