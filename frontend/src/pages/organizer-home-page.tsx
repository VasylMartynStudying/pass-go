import {
  CalendarPlus,
  LayoutDashboard,
  LoaderCircle,
  Pencil,
  ScanLine,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ApiError,
  deleteOrganizerEvent,
  getOrganizerEvents,
  type EventStatus,
  type OrganizerEvent,
} from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatEventDate } from '@/lib/date'

const statusLabels: Record<EventStatus, string> = {
  draft: 'Чернетка',
  published: 'Опубліковано',
  cancelled: 'Скасовано',
}

type ListState =
  | { status: 'loading' }
  | { status: 'success'; events: OrganizerEvent[] }
  | { status: 'error'; message: string }

function OrganizerHomePage() {
  const { user } = useAuth()
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [pendingDelete, setPendingDelete] = useState<OrganizerEvent | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let ignore = false

    getOrganizerEvents()
      .then((data) => {
        if (!ignore) setList({ status: 'success', events: data.items })
      })
      .catch((error: unknown) => {
        if (ignore) return
        setList({
          status: 'error',
          message:
            error instanceof ApiError
              ? error.message
              : 'Не вдалося завантажити заходи.',
        })
      })

    return () => {
      ignore = true
    }
  }, [])

  function reload() {
    setList({ status: 'loading' })
    getOrganizerEvents()
      .then((data) => setList({ status: 'success', events: data.items }))
      .catch((error: unknown) =>
        setList({
          status: 'error',
          message:
            error instanceof ApiError
              ? error.message
              : 'Не вдалося завантажити заходи.',
        }),
      )
  }

  async function confirmDelete() {
    if (!pendingDelete || isDeleting) return
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const title = pendingDelete.title
      await deleteOrganizerEvent(pendingDelete.slug)
      setPendingDelete(null)
      toast.success('Захід видалено', {
        description: `«${title}» прибрано зі списку.`,
      })
      reload()
    } catch (error: unknown) {
      setDeleteError(
        error instanceof ApiError
          ? error.message
          : 'Не вдалося видалити захід.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Панель організатора
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Мої заходи
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Керуйте подіями, {user?.full_name}. Чернетки не видно в публічному
            каталозі.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/organizer/scan">
              <ScanLine className="size-4" aria-hidden="true" />
              Сканер квитків
            </Link>
          </Button>
          <Button asChild>
            <Link to="/organizer/events/new">
              <CalendarPlus className="size-4" aria-hidden="true" />
              Створити захід
            </Link>
          </Button>
        </div>
      </div>

      <section className="mt-8">
        {list.status === 'loading' && (
          <div className="flex min-h-48 items-center justify-center gap-3 text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Завантажуємо заходи…
          </div>
        )}

        {list.status === 'error' && (
          <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
            <p>{list.message}</p>
            <Button variant="outline" onClick={reload}>
              Спробувати ще раз
            </Button>
          </div>
        )}

        {list.status === 'success' && list.events.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              У вас ще немає заходів. Створіть перший, щоб він з’явився тут.
            </CardContent>
          </Card>
        )}

        {list.status === 'success' && list.events.length > 0 && (
          <div className="grid gap-4">
            {list.events.map((event) => (
              <Card key={event.slug}>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {statusLabels[event.status]}
                    </p>
                    <CardTitle className="mt-1 text-xl">{event.title}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatEventDate(event.starts_at)} · {event.location}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.occupied_seats} / {event.capacity} місць
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link to={`/organizer/events/${event.slug}`}>
                        <LayoutDashboard className="size-4" aria-hidden="true" />
                        Дашборд
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/organizer/events/${event.slug}/edit`}>
                        <Pencil className="size-4" aria-hidden="true" />
                        Редагувати
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDeleteError(null)
                        setPendingDelete(event)
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Видалити
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Видалити захід?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                «{pendingDelete.title}» буде видалено. Цю дію не можна скасувати.
              </p>
              {deleteError && (
                <p className="text-sm text-destructive" role="alert">
                  {deleteError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPendingDelete(null)}
                  disabled={isDeleting}
                >
                  Скасувати
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    void confirmDelete()
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Видаляємо…' : 'Видалити'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}

export { OrganizerHomePage }
