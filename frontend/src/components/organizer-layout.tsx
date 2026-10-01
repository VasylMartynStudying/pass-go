import { CalendarCheck, Home, LogOut, ScanLine } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

function OrganizerLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link className="flex items-center gap-2 font-semibold" to="/organizer">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarCheck className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">PassGo · Організатор</span>
            <span className="sm:hidden">PassGo</span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Кабінет організатора">
            <p className="hidden text-sm text-muted-foreground md:block">
              {user?.full_name}
            </p>
            <Button size="sm" asChild>
              <Link to="/organizer/scan">
                <ScanLine className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Сканер</span>
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/" aria-label="На головну">
                <Home className="size-4 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">На головну</span>
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label="Вийти"
              onClick={() => {
                void logout()
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Вийти</span>
            </Button>
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

export { OrganizerLayout }
