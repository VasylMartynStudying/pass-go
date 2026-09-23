import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/lib/auth-context'

function ProtectedRoute() {
  const { isReady, user } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        Перевіряємо сесію…
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/organizer/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export { ProtectedRoute }
