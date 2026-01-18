import { defineStore } from 'pinia'
import { useCookie, navigateTo } from '#app'

export const useAuthStore = defineStore('authStore', () => {
  const token = ref(null)
  const user = ref(null)

  function init() {
    const authCookie = useCookie('auth_token')
    if (authCookie.value) {
      token.value = authCookie.value
      
      // Primeiro, restaurar user info do localStorage
      try {
        const userInfoStr = typeof window !== 'undefined' ? localStorage.getItem('user_info') : null
        if (userInfoStr) {
          user.value = JSON.parse(userInfoStr)
        }
      } catch (e) {
        console.warn('Could not restore user from localStorage')
      }
      
      // Depois extrair user ID do JWT como fallback
      extractUserIdFromToken(authCookie.value)
    }
  }

  function extractUserIdFromToken(tokenValue) {
    try {
      const parts = tokenValue.split('.')
      if (parts.length !== 3) return
      
      // Decode payload (segunda parte)
      const decoded = JSON.parse(atob(parts[1]))
      if (!user.value) {
        user.value = {}
      }
      
      if (decoded.sub) {
        user.value.id = parseInt(decoded.sub)
      }
      
      // Extract name and email if available
      if (decoded.name) {
        user.value.name = decoded.name
      }
      if (decoded.email) {
        user.value.email = decoded.email
      }
    } catch (e) {
      console.error('Error extracting user ID from token:', e)
    }
  }

  function logout() {
    const authCookie = useCookie('auth_token')
    authCookie.value = null

    token.value = null
    user.value = null
    
    // Limpar localStorage também
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_info')
    }

    navigateTo('/login')
  }

  function setUser(userData) {
    user.value = userData
  }

  return {
    token,
    user,
    init,
    logout,
    setUser,
    extractUserIdFromToken
  }
})
