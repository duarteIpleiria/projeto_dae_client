<script setup lang="ts">
import { VisXYContainer, VisLine, VisArea, VisAxis, VisTooltip, VisCrosshair } from '@unovis/vue'
import type { Period, Range } from '~/types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  rating: number
  count: number
}

const { width } = useElementSize(cardRef)

const config = useRuntimeConfig()
const api = config.public.apiBase
const token = useCookie('auth_token')

const data = ref<DataRecord[]>([])
const total = ref(0)
const avgRating = ref(0)

const loadRatingsDistribution = async () => {
  if (!token.value) return
  
  try {
    const response = await $fetch(`${api}/posts/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: {}
    })

    // Extract data from search response
    const publications = Array.isArray(response) 
      ? response 
      : (response?.data || [])
    
    // Group by rating (0-5 in 0.5 steps)
    const ratingCount: Record<number, number> = {
      0: 0, 0.5: 0, 1: 0, 1.5: 0, 2: 0, 2.5: 0, 3: 0, 3.5: 0, 4: 0, 4.5: 0, 5: 0
    }

    let totalRatings = 0
    let sumRatings = 0

    publications.forEach((pub: any) => {
      const rating = pub.average_rating || pub.averageRating || 0
      if (rating > 0) {
        const rounded = Math.round(rating * 2) / 2 // Round to 0.5
        ratingCount[rounded] = (ratingCount[rounded] || 0) + 1
        totalRatings++
        sumRatings += rating
      }
    })

    data.value = Object.entries(ratingCount)
      .map(([rating, count]) => ({ rating: parseFloat(rating), count }))
      .sort((a, b) => a.rating - b.rating)

    total.value = totalRatings
    avgRating.value = totalRatings > 0 ? sumRatings / totalRatings : 0
  } catch (error) {
    console.error('Error loading rating distribution:', error)
  }
}

watch([() => props.period, () => props.range], loadRatingsDistribution, { immediate: true })

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.count

const xTicks = (i: number) => {
  if (!data.value[i]) return ''
  return data.value[i].rating.toString()
}

const template = (d: DataRecord) => `${d.rating} ⭐: ${d.count} publications`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Rating Distribution
        </p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ avgRating.toFixed(1) }} ⭐ average
        </p>
      </div>
    </template>

    <VisXYContainer
      v-if="data.length > 0 && total > 0"
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
    >
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-success)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-success)"
        :opacity="0.2"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisAxis
        type="y"
        :y="y"
      />

      <VisCrosshair
        color="var(--ui-success)"
        :template="template"
      />

      <VisTooltip :container-ref="cardRef" />
    </VisXYContainer>

    <div v-else class="h-96 flex items-center justify-center text-muted">
      <p>No ratings to display</p>
    </div>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-success);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
