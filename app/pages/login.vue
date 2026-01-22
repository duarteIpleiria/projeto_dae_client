<script setup lang="ts">

definePageMeta({
  layout: 'auth'
})
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth-store'
import { storeToRefs } from 'pinia'



const router = useRouter()
const toast = useToast()
const forgotPasswordOpen = ref(false)

const email = ref('')
const password = ref('')
const loading = ref(false)

const authStore = useAuthStore()
const { token, user } = storeToRefs(authStore)

// Verificar se já está logado ao entrar na página
onMounted(() => {
  authStore.init()
  if (authStore.isAuthenticated()) {
    router.push('/publications')
  }
})

const config = useRuntimeConfig()
const api = config.public.apiBase;

const loginFormData = reactive({
  email: "",
  password: ""
})


async function login() {
  loading.value = true
  try {
    const response = await $fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: loginFormData
    })

    if (response && response.token) {
      // Configurar cookie
      const authCookie = useCookie('auth_token', {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      })
      authCookie.value = response.token

      // Atualizar store
      token.value = response.token
      authStore.setUser(response.user)

      toast.add({
        title: 'Login successful',
        description: 'Welcome to the dashboard',
        color: 'success'
      })

      await router.push('/')
    }
  } catch (e: any) {
    console.error('Login request failed:', e)
    
    loginFormData.password = ''
    
    toast.add({
      title: 'Login error',
      description: e.data?.message || 'Invalid credentials',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}


</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-950 dark:to-gray-900 px-4">
    <UCard class="w-full max-w-md shadow-xl ring-1 ring-gray-200 dark:ring-gray-800">
      <!-- Header -->
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold tracking-tight">
          Sign in to the Dashboard
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your credentials to continue
        </p>
      </div>

      <!-- Form -->
      <UForm @submit.prevent="login" class="space-y-6 w-full" style="display: grid;">

        <UFormGroup label="Email" required class="w-full">
          <UInput v-model="loginFormData.email" type="email" placeholder="admin@test.com" size="lg" icon="i-lucide-mail"
            autocomplete="email" class="w-full" />
        </UFormGroup>

        <UFormGroup label="Password" required class="w-full">
          <UInput v-model="loginFormData.password" type="password" placeholder="••••••••" size="lg" icon="i-lucide-lock"
            autocomplete="current-password" class="w-full" />
        </UFormGroup>

        <UButton type="submit" block size="lg" color="primary" :loading="loading">
          Entrar
        </UButton>
      </UForm>

      <!-- Forgot Password Link -->
      <div class="text-center mt-4">
        <button
          type="button"
          @click="forgotPasswordOpen = true"
          class="text-sm text-primary hover:underline focus:outline-none focus:underline"
        >
          Forgot your password?
        </button>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
        © {{ new Date().getFullYear() }} • Projeto DAE
      </div>
    </UCard>

    <!-- Forgot Password Modal -->
    <AuthForgotPasswordModal v-model:open="forgotPasswordOpen" />
  </div>
</template>
