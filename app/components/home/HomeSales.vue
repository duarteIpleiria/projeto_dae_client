<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

const UBadge = resolveComponent('UBadge')

const config = useRuntimeConfig()
const api = config.public.apiBase
const token = useCookie('auth_token')

interface PublicationStat {
  id: number
  title: string
  author: string
  ratings_count: number
  average_rating: number
  comments_count: number
}

const { data } = await useAsyncData<PublicationStat[]>('publication-stats', async () => {
  if (!token.value) return []

  try {
    const response = await $fetch(`${api}/posts/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: {}
    })

    const publications = Array.isArray(response) ? response : []
    
    // Map to stats and sort by rating count
    const stats = publications
      .map((pub: any) => ({
        id: pub.id,
        title: pub.title,
        author: pub.author?.name || pub.authorName || 'Unknown',
        ratings_count: pub.ratings_count || pub.ratingsCount || 0,
        average_rating: pub.average_rating || pub.averageRating || 0,
        comments_count: pub.comments?.length || 0
      }))
      .sort((a, b) => b.ratings_count - a.ratings_count)
      .slice(0, 10) // Top 10 publications

    return stats
  } catch (error) {
    console.error('Error loading publication statistics:', error)
    return []
  }
}, {
  watch: [() => props.period, () => props.range],
  default: () => []
})

const columns: TableColumn<PublicationStat>[] = [
  {
    accessorKey: 'title',
    header: 'Publication',
    cell: ({ row }) => {
      const title = row.getValue('title') as string
      return title.length > 50 ? title.substring(0, 50) + '...' : title
    }
  },
  {
    accessorKey: 'author',
    header: 'Author'
  },
  {
    accessorKey: 'ratings_count',
    header: () => h('div', { class: 'text-center' }, 'Ratings'),
    cell: ({ row }) => {
      return h('div', { class: 'text-center font-medium' }, row.getValue('ratings_count'))
    }
  },
  {
    accessorKey: 'average_rating',
    header: () => h('div', { class: 'text-center' }, 'Average'),
    cell: ({ row }) => {
      const rating = Number.parseFloat(row.getValue('average_rating'))
      const color = rating >= 4 ? 'success' : rating >= 3 ? 'warning' : 'error'
      
      return h(UBadge, { 
        class: 'justify-center', 
        variant: 'subtle', 
        color 
      }, () => `${rating.toFixed(1)} ⭐`)
    }
  },
  {
    accessorKey: 'comments_count',
    header: () => h('div', { class: 'text-center' }, 'Comments'),
    cell: ({ row }) => {
      return h('div', { class: 'text-center' }, row.getValue('comments_count'))
    }
  }
]
</script>

<template>
  <UTable
    :data="data"
    :columns="columns"
    class="shrink-0"
    :ui="{
      base: 'table-fixed border-separate border-spacing-0',
      thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
      td: 'border-b border-default'
    }"
  />
</template>
