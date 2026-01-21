<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const authStore = useAuthStore()

// Initialize auth store - runs on both server and client
console.log('[APP] Initializing app, process.client:', process.client)
authStore.init()

const route = useRoute()
const colorMode = useColorMode()
const { getCurrentUser } = useUser()

// Verify auth state on client mount
onMounted(async () => {
  console.log('[APP] App mounted on client')
  
  try {
    const tokenCookie = useCookie('auth_token')
    console.log('[APP] Token from cookie:', !!tokenCookie.value)
    console.log('[APP] Auth store state:', {
      hasToken: !!authStore.token,
      hasUser: !!authStore.user,
      userEmail: authStore.user?.email,
      tokenValid: authStore.token ? authStore.isTokenValid() : false
    })
    
    if (tokenCookie.value && authStore.user) {
      console.log('[APP] User loaded from localStorage/JWT:', authStore.user)
      // User data already restored from localStorage in authStore.init()
      // /users/me endpoint is for PATCH (updates) only, not GET
    } else if (tokenCookie.value && !authStore.user) {
      console.warn('[APP] Token exists but no user data - this should not happen')
    }
  } catch (e) {
    console.error('[APP] Error loading user:', e)
  }
})

const color = computed(() =>
  colorMode.value === 'dark' ? '#1b1718' : 'white'
)

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Nuxt Dashboard Template'
const description =
  'A professional dashboard template built with Nuxt UI, featuring multiple pages, data visualization, and comprehensive management capabilities for creating powerful admin interfaces.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
  twitterCard: 'summary_large_image'
})

</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
