import { defineStore } from 'pinia'
import { useCookie, navigateTo } from '#app'

export const useAuthStore = defineStore('authStore', () => {
  const token = ref(null)
  const user = ref(null)

  function isTokenValid() {
    if (!token.value) {
      console.log('[AUTH] Token validation: No token present')
      return false
    }
    
    try {
      const parts = token.value.split('.')
      if (parts.length !== 3) {
        console.warn('[AUTH] Token validation: Invalid token format')
        return false
      }
      
      const payload = JSON.parse(atob(parts[1]))
      const expiryTime = payload.exp * 1000
      const now = Date.now()
      const isValid = expiryTime > now
      
      if (!isValid) {
        const expired = new Date(expiryTime).toISOString()
        console.warn(`[AUTH] Token validation: Token expired at ${expired}`)
      } else {
        const expiresIn = Math.floor((expiryTime - now) / 1000 / 60)
        console.log(`[AUTH] Token validation: Valid, expires in ${expiresIn} minutes`)
      }
      
      return isValid
    } catch (e) {
      console.error('[AUTH] Token validation: Error decoding token', e)
      return false
    }
  }

  function init() {
    console.log('[AUTH] Initializing auth store...')
    const authCookie = useCookie('auth_token')
    
    console.log('[AUTH] Cookie present:', !!authCookie.value)
    
    if (authCookie.value) {
      token.value = authCookie.value
      
      // Validate token expiry first
      if (!isTokenValid()) {
        console.warn('[AUTH] Init: Token invalid or expired, clearing auth state')
        logout()
        return
      }
      
      // Primeiro, restaurar user info do localStorage
      try {
        const userInfoStr = typeof window !== 'undefined' ? localStorage.getItem('user_info') : null
        console.log('[AUTH] localStorage user_info present:', !!userInfoStr)
        
        if (userInfoStr) {
          user.value = JSON.parse(userInfoStr)
          console.log('[AUTH] Restored user from localStorage:', user.value?.email || user.value?.id)
        }
      } catch (e) {
        console.warn('[AUTH] Could not restore user from localStorage:', e)
      }
      
      // Depois extrair user ID do JWT como fallback
      extractUserIdFromToken(authCookie.value)
      
      console.log('[AUTH] Init complete - User:', user.value?.email || user.value?.id, 'Role:', user.value?.role)
    } else {
      console.log('[AUTH] Init: No auth cookie found')
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
      
      console.log('[AUTH] Extracting user from JWT token...')
      
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
      
      console.log('[AUTH] Extracted from JWT:', user.value?.email || user.value?.id)
      
      // Store updated user info in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_info', JSON.stringify(user.value))
        console.log('[AUTH] Saved user to localStorage')
      }
    } catch (e) {
      console.error('[AUTH] Error extracting user ID from token:', e)
    }
  }

  function logout(reason = 'manual') {
    console.log(`[AUTH] Logout triggered - Reason: ${reason}`)
    
    const authCookie = useCookie('auth_token')
    const hadAuth = !!authCookie.value
    
    authCookie.value = null
    token.value = null
    user.value = null
    
    // Limpar localStorage também
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_info')
      console.log('[AUTH] Cleared localStorage')
    }
    
    console.log('[AUTH] Auth state cleared')

    // Only navigate if we actually had auth (prevent double redirects)
    if (hadAuth) {
      console.log('[AUTH] Redirecting to /login')
      navigateTo('/login')
    }
  }

  function setUser(userData) {
    console.log('[AUTH] setUser called:', userData?.email || userData?.id, 'Role:', userData?.role)
    user.value = userData
    
    // Persist user data including role in localStorage
    if (typeof window !== 'undefined' && userData) {
      localStorage.setItem('user_info', JSON.stringify(userData))
      console.log('[AUTH] User saved to localStorage')
    }
  }

  return {
    token,
    user,
    init,
    logout,
    setUser,
    extractUserIdFromToken,
    isTokenValid
  }
})
