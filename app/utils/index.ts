export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomFrom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!
}

// Helper function to check if user is admin or manager/responsavel
export function isAdminOrManager(role?: string): boolean {
  if (!role) return false
  return role === 'Administrador' || role === 'Administrator' || 
         role === 'Responsavel' || role === 'Manager'
}

// Helper function to check if user is admin
export function isAdmin(role?: string): boolean {
  if (!role) return false
  return role === 'Administrador' || role === 'Administrator'
}

// Helper function to check if user can manage content
export function canManageContent(role?: string): boolean {
  if (!role) return false
  return role === 'Colaborador' || role === 'Collaborator' ||
         role === 'Responsavel' || role === 'Manager' ||
         role === 'Administrador' || role === 'Administrator'
}
