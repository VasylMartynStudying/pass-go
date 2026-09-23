import { CalendarCheck } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

import { useAuth } from '@/lib/auth-context'

function PublicLayout() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link className="flex items-center gap-2 font-semibold" to="/">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarCheck className="size-5" aria-hidden="true" />
            </span>
            <span>PassGo</span>
          </Link>
          <Link
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            to={user ? '/organizer' : '/organizer/login'}
          >
            {user ? 'Кабінет організатора' : 'Для організаторів'}
          </Link>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

export { PublicLayout }
