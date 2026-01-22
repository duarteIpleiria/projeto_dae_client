<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisAxis, VisTooltip } from '@unovis/vue'
import type { Period, Range } from '~/types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  area: string
  count: number
}

const { width } = useElementSize(cardRef)

const config = useRuntimeConfig()
const api = config.public.apiBase
const token = useCookie('auth_token')

const data = ref<DataRecord[]>([])
const total = ref(0)

const loadPublicationsByArea = async () => {
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

    const publications = Array.isArray(response) ? response : []
    
    // Group by scientific area
    const areaCount: Record<string, number> = {}
    publications.forEach((pub: any) => {
      const area = pub.scientific_area || pub.scientificArea || 'No Area'
      areaCount[area] = (areaCount[area] || 0) + 1
    })

    data.value = Object.entries(areaCount)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 areas

    total.value = publications.length
  } catch (error) {
    console.error('Error loading publications by area:', error)
  }
}

watch([() => props.period, () => props.range], loadPublicationsByArea, { immediate: true })

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.count

const xTicks = (i: number) => {
  if (!data.value[i]) return ''
  return data.value[i].area.length > 15 
    ? data.value[i].area.substring(0, 15) + '...' 
    : data.value[i].area
}

const template = (d: DataRecord) => `${d.area}: ${d.count} publications`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Publications by Scientific Area
        </p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ total }} publications
        </p>
      </div>
    </template>

    <VisXYContainer
      v-if="data.length > 0"
      :data="data"
      :padding="{ top: 40, bottom: 60 }"
      class="h-96"
      :width="width"
    >
      <VisStackedBar
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :rounded-corners="4"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
        :tick-text-angle="-45"
      />

      <VisAxis
        type="y"
        :y="y"
      />

      <VisTooltip :container-ref="cardRef" />
    </VisXYContainer>

    <div v-else class="h-96 flex items-center justify-center text-muted">
      <p>No data available</p>
    </div>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
