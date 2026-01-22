<script setup lang="ts">
// Redirecionar para publicações quando acessar a página inicial
navigateTo('/publications')
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <HomeStats :period="period" :range="range" />
      
      <div class="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <HomeChart :period="period" :range="range" />
        <HomeRatingsChart :period="period" :range="range" />
      </div>
    </template>
  </UDashboardPanel>
</template>
