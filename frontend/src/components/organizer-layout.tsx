import { CalendarCheck, LogOut } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

function OrganizerLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link className="flex items-center gap-2 font-semibold" to="/organizer">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarCheck className="size-5" aria-hidden="true" />
            </span>
            <span>PassGo · Організатор</span>
          </Link>

          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {user?.full_name}
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/">На головну</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void logout()
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Вийти
            </Button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

export { OrganizerLayout }
