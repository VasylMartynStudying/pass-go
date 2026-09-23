import { createContext, useContext } from 'react'

import type { OrganizerMe } from '@/lib/api'

export type AuthContextValue = {
  user: OrganizerMe | null
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
