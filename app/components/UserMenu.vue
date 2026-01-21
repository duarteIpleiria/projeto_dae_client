<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const appConfig = useAppConfig()

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']



const authStore = useAuthStore()
const router = useRouter()
import { storeToRefs } from 'pinia'


const { user } = storeToRefs(authStore)

console.log('user in UserMenu.vue: ', user.value)
const userLocal = computed(() => ({
  name: user.value?.name ?? 'Guest User',
  avatar: {
    src: 'https://github.com/benjamincanac.png',
    alt: user.value?.name ?? 'Guest User'
  }
}))




function handleLogout() {
  authStore.logout()
  router.push('/login')
}



const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: userLocal.value.name,
  avatar: userLocal.value.avatar
}], [
  {
    label: 'My Publications',
    icon: 'i-lucide-book-open',
    to: '/my-publications'
  },
  {
    label: 'Activity History',
    icon: 'i-lucide-activity',
    to: '/activity'
  },
  {
    label: 'Profile',
    icon: 'i-lucide-user',
    to: '/profile'
  }, {
    label: 'Log out',
    icon: 'i-lucide-log-out',
    onSelect(e) {
      e.preventDefault()
      handleLogout()
    }
  }]]))
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }">
    <UButton v-bind="{
      ...userLocal,
      label: collapsed ? undefined : userLocal?.name,
      trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
    }" color="neutral" variant="ghost" block :square="collapsed" class="data-[state=open]:bg-elevated" :ui="{
      trailingIcon: 'text-dimmed'
    }" />

    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2" :style="{
          '--chip-light': `var(--color-${(item as any).chip}-500)`,
          '--chip-dark': `var(--color-${(item as any).chip}-400)`
        }" />
      </div>
    </template>
  </UDropdownMenu>
</template>
