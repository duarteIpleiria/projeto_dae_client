export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  
  // Initialize auth from cookie on app startup
  authStore.init()
})
