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

// ===== FORMULÁRIO DE EDIÇÃO DE PERFIL =====
const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido')
})

type ProfileSchema = z.output<typeof profileSchema>

const profileState = reactive<ProfileSchema>({
  name: user.value?.name || '',
  email: user.value?.email || ''
})

// Atualizar state quando user mudar
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

    // Atualizar user no store
    const updatedUser = {
      ...user.value,
      name: response.name,
      email: response.email
    }
    authStore.setUser(updatedUser)
    
    // Guardar no localStorage também
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_info', JSON.stringify(updatedUser))
    }

    toast.add({
      title: 'Sucesso',
      description: 'Perfil atualizado com sucesso',
      color: 'success'
    })
  } catch (e) {
    toast.add({
      title: 'Erro',
      description: 'Erro ao atualizar perfil',
      color: 'error'
    })
  }
}

// ===== FORMULÁRIO DE ALTERAÇÃO DE Palavra-passe =====
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Palavra-passe atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova Palavra-passe deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação deve ter pelo menos 6 caracteres')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Palavra-passes não coincidem',
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
      title: 'Sucesso',
      description: response?.message || 'Palavra-passe alterada com sucesso',
      color: 'success'
    })

    // Reset form
    passwordState.currentPassword = ''
    passwordState.newPassword = ''
    passwordState.confirmPassword = ''
  } catch (e: any) {
    toast.add({
      title: 'Erro',
      description: e?.data?.message || 'Erro ao alterar Palavra-passe',
      color: 'error'
    })
  }
}

// ===== RECUPERAR PASSWORD =====
const showPasswordRecovery = ref(false)
const recoveryEmail = ref(user.value?.email || '')

const handleForgotPassword = async () => {
  if (!recoveryEmail.value) {
    toast.add({
      title: 'Erro',
      description: 'Digite um email válido',
      color: 'error'
    })
    return
  }

  try {
    await forgotPassword(recoveryEmail.value)

    toast.add({
      title: 'Email enviado',
      description: 'Verifique sua caixa de entrada para redefinir a Palavra-passe',
      color: 'success'
    })

    showPasswordRecovery.value = false
  } catch (e) {
    toast.add({
      title: 'Erro',
      description: 'Erro ao enviar email de recuperação',
      color: 'error'
    })
  }
}
</script>

<template>
  <UDashboardPanel id="profile">
    <template #header>
      <UDashboardNavbar title="Perfil">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-2xl space-y-6">
        <!-- Editar Perfil -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user" />
              <h3 class="font-semibold">Informações do Perfil</h3>
            </div>
          </template>

          <UForm :schema="profileSchema" :state="profileState" @submit="handleUpdateProfile" class="space-y-4">
            <UFormField label="Nome" name="name">
              <UInput
                v-model="profileState.name"
                placeholder="Seu nome"
                icon="i-lucide-user"
              />
            </UFormField>

            <UFormField label="Email" name="email">
              <UInput
                v-model="profileState.email"
                type="email"
                placeholder="seu@email.com"
                icon="i-lucide-mail"
              />
            </UFormField>

            <div class="flex justify-end">
              <UButton
                type="submit"
                :loading="loading"
                color="primary"
              >
                Salvar Alterações
              </UButton>
            </div>
          </UForm>
        </UCard>

        <!-- Recuperar Palavra-passe -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-lock" />
              <h3 class="font-semibold">Segurança</h3>
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Esqueceu sua Palavra-passe? Enviaremos um email com instruções para redefinição.
            </p>

            <div v-if="!showPasswordRecovery">
              <UButton
                @click="showPasswordRecovery = true"
                color="gray"
                variant="outline"
                icon="i-lucide-mail"
              >
                Recuperar Palavra-passe
              </UButton>
            </div>

            <div v-else class="space-y-3">
              <UFormField label="Email para recuperação" name="email">
                <UInput
                  v-model="recoveryEmail"
                  type="email"
                  placeholder="seu@email.com"
                  icon="i-lucide-mail"
                />
              </UFormField>

              <div class="flex gap-2">
                <UButton
                  @click="handleForgotPassword"
                  :loading="loading"
                  color="primary"
                >
                  Enviar Email
                </UButton>
                <UButton
                  @click="showPasswordRecovery = false"
                  color="gray"
                  variant="ghost"
                >
                  Cancelar
                </UButton>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Alterar Palavra-passe -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-lock" />
              <h3 class="font-semibold">Alterar Palavra-passe</h3>
            </div>
          </template>

          <UForm :schema="passwordSchema" :state="passwordState" @submit="handleChangePassword" class="space-y-4">
            <UFormField label="Palavra-passe Atual" name="currentPassword">
              <UInput
                v-model="passwordState.currentPassword"
                type="password"
                placeholder="Digite sua Palavra-passe atual"
                icon="i-lucide-lock"
              />
            </UFormField>

            <UFormField label="Nova Palavra-passe" name="newPassword">
              <UInput
                v-model="passwordState.newPassword"
                type="password"
                placeholder="Digite a nova Palavra-passe"
                icon="i-lucide-lock"
              />
            </UFormField>

            <UFormField label="Confirmar Nova Palavra-passe" name="confirmPassword">
              <UInput
                v-model="passwordState.confirmPassword"
                type="password"
                placeholder="Confirme a nova Palavra-passe"
                icon="i-lucide-lock"
              />
            </UFormField>

            <div class="flex justify-end">
              <UButton
                type="submit"
                :loading="loading"
                color="primary"
              >
                Alterar Palavra-passe
              </UButton>
            </div>
          </UForm>
        </UCard>

        <!-- Informações da Conta -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-info" />
              <h3 class="font-semibold">Informações da Conta</h3>
            </div>
          </template>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">ID do usuário:</span>
              <span class="font-medium">{{ user?.id || 'N/A' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Papel:</span>
              <UBadge color="blue" variant="subtle">{{ user?.role || 'N/A' }}</UBadge>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
