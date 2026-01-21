export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  const config = useRuntimeConfig()
  const api = config.public.apiBase

  // Create custom $fetch instance with interceptors
  const apiFetch = $fetch.create({
    baseURL: api,
    
    onRequest({ request, options }) {
      // Automatically attach auth token if available
      if (authStore.token && authStore.isTokenValid()) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${authStore.token}`
        }
        console.log(`[API] Request to ${request} with auth token`)
      } else if (authStore.token && !authStore.isTokenValid()) {
        console.warn('[API] Token present but invalid - should logout')
      }
    },

    onResponse({ request, response }) {
      console.log(`[API] Response from ${request}: ${response.status}`)
    },

    onResponseError({ request, response }) {
      console.error(`[API] Error response from ${request}: ${response.status}`)
      
      // Handle authentication errors globally
      if (response.status === 401) {
        console.error('[API] 401 Unauthorized - Token invalid or expired')
        
        // Only logout if we actually have a token (prevents loop)
        if (authStore.token) {
          console.log('[API] Logging out due to 401')
          authStore.logout('api_401_error')
        }
      } else if (response.status === 403) {
        console.error('[API] 403 Forbidden - Insufficient permissions')
        // Don't logout on 403, just log it
      }
    }
  })

  return {
    provide: {
      apiFetch
    }
  }
})
