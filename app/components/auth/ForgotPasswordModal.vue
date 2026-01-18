<script setup lang="ts">
import { z } from 'zod'

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const { forgotPassword } = useUser()

const schema = z.object({
  email: z.string().email('Email inválido')
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  email: ''
})

async function onSubmit() {
  try {
    await forgotPassword(state.email)
    
    toast.add({
      title: 'Email enviado',
      description: 'Email enviado com sucesso! Verifique sua caixa de entrada.',
      color: 'success'
    })
    
    // Close modal and reset form
    open.value = false
    state.email = ''
  } catch (error: any) {
    toast.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao enviar email de recuperação',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Recuperar Password"
    description="Insira o seu email para receber instruções de recuperação"
  >
    <template #body>
      <UForm :schema="schema" :state="state" @submit="onSubmit">
        <UFormGroup label="Email" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="exemplo@mail.com"
            icon="i-lucide-mail"
          />
        </UFormGroup>

        <div class="flex justify-end gap-2 mt-4">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Enviar Email"
            color="primary"
            variant="solid"
            type="submit"
            loading-auto
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
