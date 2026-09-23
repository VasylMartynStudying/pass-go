import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  getAccessToken,
  getCurrentOrganizer,
  loginOrganizer,
  logoutOrganizer,
  refreshAccessToken,
  setAccessToken,
  type OrganizerMe,
} from '@/lib/api'
import { AuthContext, type AuthContextValue } from '@/lib/auth-context'

async function loadCurrentUser() {
  if (!getAccessToken()) return null
  return getCurrentOrganizer()
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OrganizerMe | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let ignore = false

    refreshAccessToken()
      .then(() => loadCurrentUser())
      .then((currentUser) => {
        if (!ignore) setUser(currentUser)
      })
      .catch(() => {
        if (!ignore) {
          setAccessToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (!ignore) setIsReady(true)
      })

    return () => {
      ignore = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      async login(email, password) {
        await loginOrganizer(email, password)
        setUser(await getCurrentOrganizer())
      },
      async logout() {
        await logoutOrganizer()
        setUser(null)
      },
    }),
    [isReady, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider }
