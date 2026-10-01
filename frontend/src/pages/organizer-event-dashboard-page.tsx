import {
  ChevronLeft,
  Download,
  LoaderCircle,
  Pencil,
  Search,
  Users,
} from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { StatusPage } from '@/components/status-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ApiError,
  downloadEventAttendeesCsv,
  getEventDashboard,
  type EventDashboardResponse,
  type EventStatus,
} from '@/lib/api'
import { formatEventDate } from '@/lib/date'
import { catalogVisibilityHint } from '@/lib/moderation'

const PAGE_SIZE = 20

const statusLabels: Record<EventStatus, string> = {
  draft: 'Чернетка',
  published: 'Опубліковано',
  cancelled: 'Скасовано',
}

type CheckInFilter = 'all' | 'yes' | 'no'

type DashboardState =
  | { status: 'loading'; requestKey: string }
  | { status: 'not-found'; requestKey: string }
  | { status: 'forbidden'; requestKey: string }
  | { status: 'error'; requestKey: string; message: string }
  | { status: 'success'; requestKey: string; data: EventDashboardResponse }

function parseFilter(value: string | null): CheckInFilter {
  if (value === 'yes' || value === 'no') return value
  return 'all'
}

function parseOffset(value: string | null) {
  const offset = Number(value ?? 0)
  return Number.isInteger(offset) && offset >= 0 ? offset : 0
}

function OrganizerEventDashboardPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search')?.trim() ?? ''
  const checkedIn = parseFilter(searchParams.get('checked_in'))
  const offset = parseOffset(searchParams.get('offset'))
  const requestKey = `${slug ?? ''}|${search}|${checkedIn}|${offset}`
  const [retryKey, setRetryKey] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [dashboard, setDashboard] = useState<DashboardState>({
    status: 'loading',
    requestKey: '',
  })

  useEffect(() => {
    if (!slug) return

    let ignore = false

    getEventDashboard(slug, {
      search,
      checkedIn,
      offset,
      limit: PAGE_SIZE,
    })
      .then((data) => {
        if (!ignore) setDashboard({ status: 'success', requestKey, data })
      })
      .catch((error: unknown) => {
        if (ignore) return
        if (error instanceof ApiError && error.status === 404) {
          setDashboard({ status: 'not-found', requestKey })
          return
        }
        if (error instanceof ApiError && error.status === 403) {
          setDashboard({ status: 'forbidden', requestKey })
          return
        }
        setDashboard({
          status: 'error',
          requestKey,
          message:
            error instanceof ApiError
              ? error.message
              : 'Не вдалося завантажити дашборд.',
        })
      })

    return () => {
      ignore = true
    }
  }, [slug, search, checkedIn, offset, retryKey, requestKey])

  function retry() {
    setDashboard({ status: 'loading', requestKey })
    setRetryKey((key) => key + 1)
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextSearch = String(formData.get('search') ?? '').trim()
    const nextParams = new URLSearchParams()
    if (nextSearch) nextParams.set('search', nextSearch)
    if (checkedIn !== 'all') nextParams.set('checked_in', checkedIn)
    setSearchParams(nextParams)
    if (nextSearch === search && offset === 0) {
      retry()
    }
  }

  function setFilter(nextFilter: CheckInFilter) {
    const nextParams = new URLSearchParams()
    if (search) nextParams.set('search', search)
    if (nextFilter !== 'all') nextParams.set('checked_in', nextFilter)
    setSearchParams(nextParams)
  }

  function setPage(nextOffset: number) {
    const nextParams = new URLSearchParams()
    if (search) nextParams.set('search', search)
    if (checkedIn !== 'all') nextParams.set('checked_in', checkedIn)
    if (nextOffset > 0) nextParams.set('offset', String(nextOffset))
    setSearchParams(nextParams)
  }

  async function exportCsv() {
    if (!slug || isExporting) return
    setIsExporting(true)
    try {
      await downloadEventAttendeesCsv(slug, { search, checkedIn })
      toast.success('CSV завантажено', {
        description: 'Список учасників збережено у файл.',
      })
    } catch (error: unknown) {
      toast.error('Не вдалося експортувати CSV', {
        description:
          error instanceof ApiError
            ? error.message
            : 'Спробуйте ще раз за кілька секунд.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const isLoading =
    dashboard.status === 'loading' || dashboard.requestKey !== requestKey

  if (!isLoading && dashboard.status === 'not-found') {
    return (
      <StatusPage
        title="Захід не знайдено"
        description="Можливо, це чужа подія або її вже видалено."
        actionTo="/organizer"
        actionLabel="До моїх заходів"
      />
    )
  }

  if (!isLoading && dashboard.status === 'forbidden') {
    return (
      <StatusPage
        title="Немає доступу"
        description="Цей захід доступний лише його організатору."
        actionTo="/organizer"
        actionLabel="До моїх заходів"
      />
    )
  }

  const event =
    !isLoading && dashboard.status === 'success'
      ? dashboard.data.event
      : undefined
  const attendees =
    !isLoading && dashboard.status === 'success' ? dashboard.data.attendees : []
  const attendeesTotal =
    !isLoading && dashboard.status === 'success'
      ? dashboard.data.attendees_total
      : 0
  const from = attendeesTotal === 0 ? 0 : offset + 1
  const to = Math.min(offset + attendees.length, attendeesTotal)
  const hasFilters = Boolean(search) || checkedIn !== 'all'

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Button variant="outline" size="sm" asChild>
        <Link to="/organizer">
          <ChevronLeft className="size-4" aria-hidden="true" />
          До моїх заходів
        </Link>
      </Button>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Дашборд заходу
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {event?.title ?? 'Завантажуємо…'}
          </h1>
          {event && (
            <>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                {statusLabels[event.status]} · {formatEventDate(event.starts_at)} ·{' '}
                {event.location}
              </p>
              {catalogVisibilityHint(event) && (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {catalogVisibilityHint(event)}
                </p>
              )}
            </>
          )}
        </div>
        {event && (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isExporting}
              onClick={() => {
                void exportCsv()
              }}
            >
              <Download className="size-4" aria-hidden="true" />
              {isExporting ? 'Завантажуємо…' : 'Експорт CSV'}
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/organizer/events/${event.slug}/edit`}>
                <Pencil className="size-4" aria-hidden="true" />
                Редагувати
              </Link>
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="mt-10 flex min-h-48 items-center justify-center gap-3 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          Завантажуємо дашборд…
        </div>
      )}

      {!isLoading && dashboard.status === 'error' && (
        <div className="mt-10 flex min-h-48 flex-col items-center justify-center gap-4 text-center">
          <p>{dashboard.message}</p>
          <Button variant="outline" onClick={retry}>
            Спробувати ще раз
          </Button>
        </div>
      )}

      {!isLoading && dashboard.status === 'success' && event && (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Зареєстровано
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {event.occupied_seats}{' '}
                <span className="text-lg font-normal text-muted-foreground">
                  / {event.capacity}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Вільних місць
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {event.available_seats}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Присутні
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {dashboard.data.checked_in_count}
              </CardContent>
            </Card>
          </section>

          <section className="mt-8">
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={submitSearch}
            >
              <label className="relative flex-1">
                <span className="sr-only">Пошук учасників</span>
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  defaultValue={search}
                  key={search}
                  name="search"
                  placeholder="Ім’я або email"
                  type="search"
                />
              </label>
              <label className="sm:w-52">
                <span className="sr-only">Статус присутності</span>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
                  onChange={(changeEvent) =>
                    setFilter(parseFilter(changeEvent.target.value))
                  }
                  value={checkedIn}
                >
                  <option value="all">Усі учасники</option>
                  <option value="yes">Присутні</option>
                  <option value="no">Очікують</option>
                </select>
              </label>
              <Button type="submit">Знайти</Button>
            </form>

            {attendeesTotal === 0 ? (
              <Card className="mt-6">
                <CardContent className="flex flex-col items-center py-12 text-center text-muted-foreground">
                  {hasFilters ? (
                    <Search
                      className="mb-4 size-10 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <Users
                      className="mb-4 size-10 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <h2 className="text-xl font-semibold text-foreground">
                    {hasFilters
                      ? 'Нікого не знайдено'
                      : 'Учасників ще немає'}
                  </h2>
                  <p className="mt-2 max-w-md">
                    {hasFilters
                      ? 'Спробуйте змінити пошук або фільтр статусу присутності.'
                      : 'Коли хтось зареєструється, ім’я та email з’являться в цьому списку.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="mt-6 text-sm text-muted-foreground">
                  Показано {from}–{to} з {attendeesTotal}
                </p>

                <div className="mt-4 hidden overflow-x-auto rounded-lg border md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Учасник</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Реєстрація</th>
                        <th className="px-4 py-3 font-medium">Присутність</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((attendee) => (
                        <tr
                          className="border-t"
                          key={`${attendee.email}-${attendee.registered_at}`}
                        >
                          <td className="px-4 py-3 font-medium">
                            {attendee.full_name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {attendee.email}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatEventDate(attendee.registered_at)}
                          </td>
                          <td className="px-4 py-3">
                            {attendee.is_checked_in ? (
                              <span>Присутній</span>
                            ) : (
                              <span className="text-muted-foreground">
                                Очікує
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 grid gap-3 md:hidden">
                  {attendees.map((attendee) => (
                    <Card
                      key={`${attendee.email}-${attendee.registered_at}`}
                    >
                      <CardHeader>
                        <CardTitle className="text-base">
                          {attendee.full_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {attendee.email}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          Реєстрація: {formatEventDate(attendee.registered_at)}
                        </p>
                        <p>
                          {attendee.is_checked_in ? 'Присутній' : 'Очікує'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {attendeesTotal > PAGE_SIZE && (
                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      disabled={offset === 0}
                      onClick={() => setPage(Math.max(offset - PAGE_SIZE, 0))}
                      variant="outline"
                    >
                      Назад
                    </Button>
                    <Button
                      disabled={offset + PAGE_SIZE >= attendeesTotal}
                      onClick={() => setPage(offset + PAGE_SIZE)}
                      variant="outline"
                    >
                      Далі
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export { OrganizerEventDashboardPage }
