<script setup lang="ts">

definePageMeta({
  layout: 'auth'
})
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth-store'
import { storeToRefs } from 'pinia'



const router = useRouter()
const toast = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)

const authStore = useAuthStore()
const { token, user } = storeToRefs(authStore)


const config = useRuntimeConfig()
const api = config.public.apiBase;

const loginFormData = reactive({
  email: "",
  password: ""
})


async function login() {
  loading.value = true
  try {
    await $fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: loginFormData,
      onResponse({ request, response, options }) {

        if (response.status === 200) {

          token.value = response._data.token
          user.value = response._data.user


          const authCookie = useCookie('auth_token', {
            sameSite: 'lax',
            path: '/',
            secure: process.env.NODE_ENV === 'production'
          })

          authCookie.value = response._data.token 

          toast.add({
            title: 'Login com sucesso',
            description: 'Bem-vindo ao dashboard',
            color: 'success'
          })

          loading.value = false
          router.push('/')
        }
        else if (response.status == 401) {
          loginFormData.password = ''
          loginFormData.email = ''
          loading.value = false
          toast.add({
            title: 'Credenciais inválidas',
            description: 'Verifica o email e a password',
            color: 'error'
          })
        }


      }
    })


  } catch (e) {
    console.error('login request failed: ', e)
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
          Entrar no Dashboard
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Introduz as tuas credenciais para continuar
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

      <!-- Footer -->
      <div class="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
        © {{ new Date().getFullYear() }} • Projeto DAE
      </div>
    </UCard>
  </div>
</template>
