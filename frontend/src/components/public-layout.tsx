import { CalendarCheck } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link className="flex items-center gap-2 font-semibold" to="/">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarCheck className="size-5" aria-hidden="true" />
            </span>
            <span>PassGo</span>
          </Link>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

export { PublicLayout }
