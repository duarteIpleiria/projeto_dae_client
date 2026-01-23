<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth-store'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const publication = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const newComment = ref('')
const isSubmittingComment = ref(false)

const loadPublication = async () => {
  try {
    loading.value = true
    error.value = null
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const id = route.params.id

    const headers: any = {}
    if (authStore.token) {
      headers.Authorization = `Bearer ${authStore.token}`
    }

    const response = await $fetch(`${api}/posts/${id}`, {
      method: 'GET',
      headers
    })

    publication.value = response
  } catch (err: any) {
    console.error('Error loading publication:', err)
    error.value = err?.data?.error || 'Erro ao carregar publicação'
    
    if (err.status === 404) {
      toast.add({
        title: 'Publicação não encontrada',
        description: 'A publicação que procura não existe ou não tem permissão para visualizá-la',
        color: 'red'
      })
      router.push('/publications')
    }
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Data desconhecida'
  const date = new Date(dateString)
  const day = date.getDate()
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day} de ${month} de ${year} às ${hours}:${minutes}`
}

const downloadFile = async () => {
  try {
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const id = route.params.id

    const headers: any = {}
    if (authStore.token) {
      headers.Authorization = `Bearer ${authStore.token}`
    }

    const response = await fetch(`${api}/posts/${id}/download`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      throw new Error('Erro ao fazer download')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = publication.value.fileName || 'publication.pdf'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.add({
      title: 'Download iniciado',
      description: 'O ficheiro está a ser transferido',
      color: 'green'
    })
  } catch (err) {
    console.error('Download error:', err)
    toast.add({
      title: 'Erro',
      description: 'Não foi possível fazer o download do ficheiro',
      color: 'red'
    })
  }
}

const submitComment = async () => {
  if (!newComment.value.trim()) {
    toast.add({
      title: 'Erro',
      description: 'O comentário não pode estar vazio',
      color: 'red'
    })
    return
  }

  try {
    isSubmittingComment.value = true
    const config = useRuntimeConfig()
    const api = config.public.apiBase
    const id = route.params.id

    await $fetch(`${api}/posts/${id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: {
        comment: newComment.value
      }
    })

    toast.add({
      title: 'Sucesso',
      description: 'Comentário adicionado com sucesso',
      color: 'green'
    })

    newComment.value = ''
    await loadPublication() // Reload to show new comment
  } catch (err: any) {
    console.error('Error submitting comment:', err)
    toast.add({
      title: 'Erro',
      description: err?.data?.error || 'Erro ao adicionar comentário',
      color: 'red'
    })
  } finally {
    isSubmittingComment.value = false
  }
}

onMounted(() => {
  loadPublication()
})
</script>

<style scoped>
/* Garantir que a página pode fazer scroll */
</style>

<template>
  <div class="w-full overflow-y-auto">
    <div class="container mx-auto px-4 py-8 max-w-5xl pb-20">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        @click="router.back()"
        class="mb-6"
      >
        Back
      </UButton>

      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading publication...</p>
        </div>
      </div>

      <div v-else-if="error" class="text-center py-20">
        <UIcon name="i-lucide-alert-circle" class="w-16 h-16 mx-auto mb-4 text-red-500" />
        <p class="text-lg font-medium">{{ error }}</p>
      </div>

      <div v-else-if="publication" class="space-y-6">
      <!-- Header -->
      <UCard>
        <div class="space-y-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h1 class="text-3xl font-bold mb-2">
                {{ publication.title }}
              </h1>
              <div class="flex items-center gap-3 text-sm text-gray-600">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-user" />
                  {{ publication.author?.name || 'Unknown author' }}
                </span>
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-calendar" />
                  {{ formatDate(publication.createdAt) }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <UBadge v-if="publication.confidential" color="red">
                <UIcon name="i-lucide-lock" class="mr-1" />
                Confidencial
              </UBadge>
              <UBadge :color="publication.visible ? 'green' : 'red'">
                {{ publication.visible ? 'Visible' : 'Hidden' }}
              </UBadge>
            </div>
          </div>

          <!-- Stats -->
          <div class="flex items-center gap-6 pt-4 border-t">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-star" class="text-yellow-500" />
                <span class="font-semibold">{{ publication.averageRating?.toFixed(1) || '0.0' }}</span>
                <span class="text-sm text-gray-500">({{ publication.ratingsCount || 0 }} ratings)</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-message-circle" />
                <span class="font-semibold">{{ publication.commentsCount || 0 }}</span>
              <span class="text-sm text-gray-500">comments</span>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Scientific Area & Tags -->
      <UCard>
        <div class="space-y-4">
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">
              Scientific Area
            </h3>
            <p class="text-lg">
              {{ publication.scientificArea }}
            </p>
          </div>

          <div v-if="publication.tags && publication.tags.length > 0">
            <h3 class="text-sm font-medium text-gray-500 mb-2">
              Tags
            </h3>
            <div class="flex flex-wrap gap-2">
              <UBadge 
                v-for="tag in publication.tags" 
                :key="tag.id" 
                variant="outline"
                class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {{ tag.name }}
              </UBadge>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Summary -->
      <UCard>
        <div>
          <h3 class="text-lg font-semibold mb-3">
            Summary
          </h3>
          <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {{ publication.summary }}
          </p>
        </div>
      </UCard>

      <!-- File Download -->
      <UCard v-if="publication.fileName">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-file-text" class="w-8 h-8 text-blue-500" />
            <div>
              <p class="font-medium">
                {{ publication.fileName }}
              </p>
              <p class="text-sm text-gray-500">
                Publication file
              </p>
            </div>
          </div>
          <UButton
            icon="i-lucide-download"
            @click="downloadFile"
          >
            Download
          </UButton>
        </div>
      </UCard>

      <!-- Comments -->
      <UCard>
        <div class="space-y-6">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-lucide-message-circle" class="w-4 h-4" />
            Comments ({{ publication.comments?.length || 0 }})
          </h3>

          <!-- Add Comment Form (only if authenticated) -->
          <div v-if="authStore.isAuthenticated" class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-lucide-edit" class="w-4 h-4" />
              Leave a Comment
            </h4>
            <div class="space-y-2">
              <UTextarea
                v-model="newComment"
                placeholder="Write your comment..."
                :disabled="isSubmittingComment"
                :rows="3"
                class="w-full"
              />
              <div class="flex gap-2 justify-end">
                <UButton
                  color="primary"
                  size="sm"
                  :loading="isSubmittingComment"
                  :disabled="!newComment.trim() || isSubmittingComment"
                  @click="submitComment"
                  icon="i-lucide-send"
                >
                  Submit
                </UButton>
              </div>
            </div>
          </div>

          <!-- Login prompt for non-authenticated users -->
          <div v-else class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
            <p class="text-sm mb-2">
              Please login to leave a comment
            </p>
            <UButton
              variant="soft"
              @click="router.push('/login')"
            >
              Log In
            </UButton>
          </div>

          <!-- Comments List -->
          <div v-if="publication.comments && publication.comments.length > 0" class="space-y-3">
            <div
              v-for="comment in publication.comments"
              :key="comment.id"
              class="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
            >
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                      <span class="text-xs font-semibold text-white">
                        {{ (comment.author?.name?.[0] || 'A').toUpperCase() }}
                      </span>
                    </div>
                    <span class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ comment.author?.name || 'User' }}
                    </span>
                    <UBadge v-if="!comment.visible" color="neutral" variant="subtle" size="xs">
                      Hidden
                    </UBadge>
                  </div>
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {{ formatDate(comment.createdAt) }}
                </span>
              </div>
              <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-8">{{ comment.comment }}</p>
            </div>
          </div>

          <!-- No comments message -->
          <div v-else class="text-center py-12 text-gray-500">
            <UIcon name="i-lucide-message-circle" class="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p class="text-lg font-medium mb-1">
              No comments yet
            </p>
            <p class="text-sm">
              Be the first to comment!
            </p>
          </div>
        </div>
      </UCard>
      </div>
    </div>
  </div>
</template>
