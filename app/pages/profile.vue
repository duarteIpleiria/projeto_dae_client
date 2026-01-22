<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '~/stores/auth-store'
import { storeToRefs } from 'pinia'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'default'
})

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const { updateProfile, forgotPassword, changePassword, loading } = useUser()
const toast = useToast()

const profileSchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email')
})

type ProfileSchema = z.output<typeof profileSchema>

const profileState = reactive<ProfileSchema>({
  name: user.value?.name || '',
  email: user.value?.email || ''
})

// Keep state in sync when user changes
watch(user, (newUser) => {
  if (newUser) {
    profileState.name = newUser.name || ''
    profileState.email = newUser.email || ''
  }
}, { immediate: true })

const handleUpdateProfile = async (event: FormSubmitEvent<ProfileSchema>) => {
  try {
    const response = await updateProfile({
      name: event.data.name,
      email: event.data.email
    })

    // Update user in the store
    const updatedUser = {
      ...user.value,
      name: response.name,
      email: response.email
    }
    authStore.setUser(updatedUser)
    
    // Persist to localStorage too
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_info', JSON.stringify(updatedUser))
    }

    toast.add({
      title: 'Success',
      description: 'Profile updated successfully',
      color: 'success'
    })
  } catch (e) {
    toast.add({
      title: 'Error',
      description: 'Failed to update profile',
      color: 'error'
    })
  }
}

// ===== CHANGE PASSWORD FORM =====
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must have at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirmation must have at least 6 characters')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type PasswordSchema = z.output<typeof passwordSchema>

const passwordState = reactive<PasswordSchema>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const handleChangePassword = async (event: FormSubmitEvent<PasswordSchema>) => {
  try {
    const response = await changePassword({
      currentPassword: event.data.currentPassword,
      newPassword: event.data.newPassword
    })

    toast.add({
      title: 'Success',
      description: response?.message || 'Password changed successfully',
      color: 'success'
    })

    // Reset form
    passwordState.currentPassword = ''
    passwordState.newPassword = ''
    passwordState.confirmPassword = ''
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e?.data?.message || 'Failed to change password',
      color: 'error'
    })
  }
}

// ===== PASSWORD RECOVERY =====
const showPasswordRecovery = ref(false)
const recoveryEmail = ref(user.value?.email || '')

const handleForgotPassword = async () => {
  if (!recoveryEmail.value) {
    toast.add({
      title: 'Error',
      description: 'Enter a valid email',
      color: 'error'
    })
    return
  }

  try {
    await forgotPassword(recoveryEmail.value)

    toast.add({
      title: 'Email sent',
      description: 'Check your inbox to reset your password',
      color: 'success'
    })

    showPasswordRecovery.value = false
  } catch (e) {
    toast.add({
      title: 'Error',
      description: 'Failed to send recovery email',
      color: 'error'
    })
  }
}
</script>

<template>
  <UDashboardPanel id="profile">
    <template #header>
      <UDashboardNavbar title="Profile">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-2xl space-y-6">
        <!-- Edit Profile -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user" />
              <h3 class="font-semibold">Profile Information</h3>
            </div>
          </template>

          <UForm :schema="profileSchema" :state="profileState" @submit="handleUpdateProfile" class="space-y-4">
            <UFormField label="Name" name="name">
              <UInput
                v-model="profileState.name"
                placeholder="Your name"
                icon="i-lucide-user"
              />
            </UFormField>

            <UFormField label="Email" name="email">
              <UInput
                v-model="profileState.email"
                type="email"
                placeholder="you@email.com"
                icon="i-lucide-mail"
              />
            </UFormField>

            <div class="flex justify-end">
              <UButton
                type="submit"
                :loading="loading"
                color="primary"
              >
                Save Changes
              </UButton>
            </div>
          </UForm>
        </UCard>

        <!-- Password Recovery -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-lock" />
              <h3 class="font-semibold">Security</h3>
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Forgot your password? We will send an email with reset instructions.
            </p>

            <div v-if="!showPasswordRecovery">
              <UButton
                @click="showPasswordRecovery = true"
                color="gray"
                variant="outline"
                icon="i-lucide-mail"
              >
                Recover Password
              </UButton>
            </div>

            <div v-else class="space-y-3">
              <UFormField label="Recovery email" name="email">
                <UInput
                  v-model="recoveryEmail"
                  type="email"
                  placeholder="you@email.com"
                  icon="i-lucide-mail"
                />
              </UFormField>

              <div class="flex gap-2">
                <UButton
                  @click="handleForgotPassword"
                  :loading="loading"
                  color="primary"
                >
                  Send Email
                </UButton>
                <UButton
                  @click="showPasswordRecovery = false"
                  color="gray"
                  variant="ghost"
                >
                  Cancel
                </UButton>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Change Password -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-lock" />
              <h3 class="font-semibold">Change Password</h3>
            </div>
          </template>

          <UForm :schema="passwordSchema" :state="passwordState" @submit="handleChangePassword" class="space-y-4">
            <UFormField label="Current Password" name="currentPassword">
              <UInput
                v-model="passwordState.currentPassword"
                type="password"
                placeholder="Enter your current password"
                icon="i-lucide-lock"
              />
            </UFormField>

            <UFormField label="New Password" name="newPassword">
              <UInput
                v-model="passwordState.newPassword"
                type="password"
                placeholder="Enter your new password"
                icon="i-lucide-lock"
              />
            </UFormField>

            <UFormField label="Confirm New Password" name="confirmPassword">
              <UInput
                v-model="passwordState.confirmPassword"
                type="password"
                placeholder="Confirm the new password"
                icon="i-lucide-lock"
              />
            </UFormField>

            <div class="flex justify-end">
              <UButton
                type="submit"
                :loading="loading"
                color="primary"
              >
                Change Password
              </UButton>
            </div>
          </UForm>
        </UCard>

        <!-- Account Information -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-info" />
              <h3 class="font-semibold">Account Information</h3>
            </div>
          </template>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">User ID:</span>
              <span class="font-medium">{{ user?.id || 'N/A' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Role:</span>
              <UBadge color="blue" variant="subtle">{{ user?.role || 'N/A' }}</UBadge>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
