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
      
      // Preservar dados existentes do localStorage
      if (!user.value) {
        user.value = {}
      }
      
      // Apenas adicionar/atualizar campos que não existem ou são do token
      if (decoded.sub && !user.value.id) {
        user.value.id = parseInt(decoded.sub)
      }
      
      // Extract name and email if available no token e não existirem
      if (decoded.name && !user.value.name) {
        user.value.name = decoded.name
      }
      if (decoded.email && !user.value.email) {
        user.value.email = decoded.email
      }
      
      // Apenas salvar se adicionamos novos dados
      if (decoded.sub || decoded.name || decoded.email) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_info', JSON.stringify(user.value))
        }
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
    
    // Persist user data including role in localStorage
    if (typeof window !== 'undefined' && userData) {
      localStorage.setItem('user_info', JSON.stringify(userData))
    }
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
