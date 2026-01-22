export default defineNuxtRouteMiddleware((to) => {
  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/publications', '/']
  
  if (publicRoutes.includes(to.path)) return

  const authCookie = useCookie('auth_token')

  if (!authCookie.value) {
    return navigateTo('/login')
  }
})
