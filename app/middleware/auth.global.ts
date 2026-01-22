export default defineNuxtRouteMiddleware((to) => {
  console.log(`[MIDDLEWARE] Checking auth for route: ${to.path}`)
  
  // Allow login page
  if (to.path === '/login') {
    console.log('[MIDDLEWARE] Login page - allowing access')
    return
  }

  const authStore = useAuthStore()
  
  // Initialize auth store on client-side if not already done
  if (process.client && !authStore.token) {
    console.log('[MIDDLEWARE] Store not initialized, calling init()')
    authStore.init()
  }
  
  // Check if token is valid
  if (!authStore.token) {
    console.warn('[MIDDLEWARE] No token in store - redirecting to login')
    return navigateTo('/login')
  }
  
  // Validate token expiry
  if (!authStore.isTokenValid()) {
    console.warn('[MIDDLEWARE] Token invalid/expired - clearing and redirecting')
    authStore.logout('token_expired')
    return navigateTo('/login')
  }
  
  console.log('[MIDDLEWARE] Auth check passed for:', authStore.user?.email || authStore.user?.id)
})
