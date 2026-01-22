<script setup lang="ts">


import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()
const authStore = useAuthStore()

const open = ref(false)

// Check if user can access hidden content
const canAccessHiddenContent = computed(() => {
  return authStore.user?.role === 'Administrador' || authStore.user?.role === 'Responsavel'
})

const links = computed(() => {
  // Se não estiver autenticado, mostrar apenas home
  if (!authStore.user) {
    return [[{
      label: 'Home',
      icon: 'i-lucide-house',
      to: '/',
      onSelect: () => {
        open.value = false
      }
    }], []] satisfies NavigationMenuItem[][]
  }

  const baseLinks: NavigationMenuItem[] = [{
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Publications',
    icon: 'i-lucide-book-open-check',
    to: '/publications',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Tags',
    icon: 'i-lucide-tags',
    to: '/tags',
    onSelect: () => {
      open.value = false
    }
  }]

  // Add Users link only for Administrador
  if (authStore.user?.role === 'Administrador') {
    baseLinks.push({
      label: 'Users',
      icon: 'i-lucide-user',
      to: '/users',
      onSelect: () => {
        open.value = false
      }
    })
  }

  // Add Hidden Content link for admins and responsaveis
  if (canAccessHiddenContent.value) {
    baseLinks.push({
      label: 'Hidden Content',
      icon: 'i-lucide-eye-off',
      to: '/hidden-content',
      onSelect: () => {
        open.value = false
      }
    })
  }

  return [[...baseLinks], []] satisfies NavigationMenuItem[][]
})

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Accept',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Opt out',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar id="default" v-model:open="open" collapsible resizable class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }">
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="links[0]" orientation="vertical" tooltip popover />
        
        <!-- Mensagem para visitantes anônimos -->
        <div v-if="!authStore.user" :class="collapsed ? 'px-2 py-3' : 'px-4 py-3'">
          <UCard :ui="{ body: 'p-3' }">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-info" class="w-4 h-4 text-primary-500" />
                <p v-if="!collapsed" class="text-xs font-semibold text-gray-900 dark:text-white">
                  Modo Visitante
                </p>
              </div>
              <p v-if="!collapsed" class="text-xs text-gray-600 dark:text-gray-400">
                Faça login para comentar, avaliar e interagir com as publicações.
              </p>
              <UButton 
                v-if="!collapsed"
                color="primary" 
                size="xs" 
                block
                icon="i-lucide-log-in"
                to="/login"
              >
                Fazer Login
              </UButton>
            </div>
          </UCard>
        </div>
      </template>

      <template #footer="{ collapsed }">
        <ClientOnly>
          <UserMenu :collapsed="collapsed" />
          <template #fallback>
            <div :class="['px-2.5 py-1.5', collapsed ? 'flex items-center justify-center' : 'w-full']" />
          </template>
        </ClientOnly>
      </template>
    </UDashboardSidebar>

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
