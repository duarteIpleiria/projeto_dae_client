<script setup lang="ts">
import type { Period, Range } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

const config = useRuntimeConfig()
const api = config.public.apiBase
const token = useCookie('auth_token')

interface AppStats {
  title: string
  icon: string
  value: number | string
  color?: string
  to?: string
}

const { data: stats, refresh } = await useAsyncData<AppStats[]>('app-stats', async () => {
  if (!token.value) return []
  
  try {
    // Buscar todas as estatísticas em paralelo
    const [usersRes, publicationsRes, tagsRes] = await Promise.all([
      $fetch(`${api}/users`, {
        headers: { Authorization: `Bearer ${token.value}` }
      }).catch(() => []),
      $fetch(`${api}/posts/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json'
        },
        body: {}
      }).catch(() => []),
      $fetch(`${api}/tags`, {
        headers: { Authorization: `Bearer ${token.value}` }
      }).catch(() => [])
    ])

    const users = Array.isArray(usersRes) ? usersRes : []
    const publications = Array.isArray(publicationsRes) ? publicationsRes : []
    const tags = Array.isArray(tagsRes) ? tagsRes : []

    console.log('Dashboard - Publicações:', publications)

    // Calcular estatísticas de avaliações
    const totalRatings = publications.reduce((sum: number, pub: any) => 
      sum + (pub.ratings_count || pub.ratingsCount || 0), 0
    )

    const avgRating = publications.length > 0
      ? publications.reduce((sum: number, pub: any) => 
          sum + (pub.average_rating || pub.averageRating || 0), 0
        ) / publications.length
      : 0

    // Contar publicações visíveis - verificar ambas as propriedades
    const visiblePublications = publications.filter((pub: any) => {
      const isVisible = pub.is_visible !== undefined ? pub.is_visible : pub.visible
      console.log(`Pub ${pub.id}: is_visible=${pub.is_visible}, visible=${pub.visible}, resultado=${isVisible}`)
      return isVisible === true
    }).length

    // Contar total de comentários
    const totalComments = publications.reduce((sum: number, pub: any) => 
      sum + (pub.comments?.length || 0), 0
    )

    console.log('Total publicações:', publications.length)
    console.log('Publicações visíveis:', visiblePublications)

    return [
      {
        title: 'Utilizadores',
        icon: 'i-lucide-users',
        value: users.length,
        color: 'primary',
        to: '/users'
      },
      {
        title: 'Publicações',
        icon: 'i-lucide-file-text',
        value: publications.length,
        color: 'success',
        to: '/publications'
      },
      {
        title: 'Tags',
        icon: 'i-lucide-tags',
        value: tags.length,
        color: 'warning',
        to: '/tags'
      },
      {
        title: 'Avaliação Média',
        icon: 'i-lucide-star',
        value: avgRating.toFixed(1),
        color: 'info'
      },
      {
        title: 'Total Avaliações',
        icon: 'i-lucide-chart-bar',
        value: totalRatings,
        color: 'secondary'
      },
      {
        title: 'Total Comentários',
        icon: 'i-lucide-message-square',
        value: totalComments,
        color: 'primary'
      }
    ]
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error)
    return []
  }
}, {
  watch: [() => props.period, () => props.range],
  default: () => []
})
</script>

<template>
  <UPageGrid class="lg:grid-cols-3 gap-4 sm:gap-6">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      :to="stat.to"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
