<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
const authStore = useAuthStore()
authStore.init()
const route = useRoute()
const colorMode = useColorMode()
const { getCurrentUser } = useUser()

// Carregar dados do user ao iniciar
onMounted(async () => {
  try {
    const tokenCookie = useCookie('auth_token')
    console.log('App mounted, token from cookie:', !!tokenCookie.value)
    
    if (tokenCookie.value && authStore.user) {
      console.log('User loaded from localStorage/JWT:', authStore.user)
      // User data already restored from localStorage in authStore.init()
      // /users/me endpoint is for PATCH (updates) only, not GET
    }
  } catch (e) {
    console.error('Error loading user:', e)
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
