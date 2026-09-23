import {
  ArrowLeft,
  CalendarDays,
  LoaderCircle,
  MapPin,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { RegistrationForm } from '@/components/registration-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError, getEvent, type EventDetail } from '@/lib/api'
import { formatEventDate } from '@/lib/date'

type DetailState =
  | { status: 'loading' }
  | { status: 'success'; event: EventDetail }
  | { status: 'not-found' }
  | { status: 'error' }

function EventDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<DetailState>({ status: 'loading' })

  function handleRegistered(ticketToken: string) {
    void navigate(`/tickets/${ticketToken}`, { replace: true })
  }

  useEffect(() => {
    let ignore = false

    getEvent(slug)
      .then((event) => {
        if (!ignore) setState({ status: 'success', event })
      })
      .catch((error: unknown) => {
        if (ignore) return
        setState({
          status: error instanceof ApiError && error.status === 404
            ? 'not-found'
            : 'error',
        })
      })

    return () => {
      ignore = true
    }
  }, [slug])

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        Завантажуємо інформацію…
      </main>
    )
  }

  if (state.status === 'not-found' || state.status === 'error') {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold">
          {state.status === 'not-found'
            ? 'Захід не знайдено'
            : 'Не вдалося завантажити захід'}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Він міг завершитися, бути знятим із публікації або тимчасово недоступний.
        </p>
        <Button className="mt-6" variant="outline" asChild>
          <Link to="/">Повернутися до каталогу</Link>
        </Button>
      </main>
    )
  }

  const event = state.event
  const occupancy = Math.round((event.occupied_seats / event.capacity) * 100)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Button className="mb-6" variant="outline" size="sm" asChild>
        <Link to="/">
          <ArrowLeft className="size-4" aria-hidden="true" />
          До каталогу
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <article>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Майбутній захід
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {event.title}
          </h1>

          <dl className="mt-8 grid gap-4 text-muted-foreground sm:grid-cols-2">
            <div className="flex gap-3 rounded-lg border bg-card p-4">
              <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
              <div>
                <dt className="font-medium text-foreground">Дата і час</dt>
                <dd className="mt-1 text-sm">
                  {formatEventDate(event.starts_at)}
                </dd>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border bg-card p-4">
              <MapPin className="size-5 shrink-0" aria-hidden="true" />
              <div>
                <dt className="font-medium text-foreground">Локація</dt>
                <dd className="mt-1 text-sm">{event.location}</dd>
              </div>
            </div>
          </dl>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Про захід</h2>
            <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">
              {event.description}
            </p>
          </section>
        </article>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Реєстрація</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="size-4" aria-hidden="true" />
                    Заповненість
                  </span>
                  <span>
                    {event.occupied_seats} / {event.capacity}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={event.capacity}
                  aria-valuenow={event.occupied_seats}
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Вільних місць: {event.available_seats}
                </p>
              </div>

              <RegistrationForm
                event={event}
                onRegistered={(registration) =>
                  handleRegistered(registration.ticket_token)
                }
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}

export { EventDetailPage }
