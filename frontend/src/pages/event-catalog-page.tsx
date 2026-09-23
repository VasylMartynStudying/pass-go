import { CalendarX, LoaderCircle, Search } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EventCard } from '@/components/event-card'
import { Button } from '@/components/ui/button'
import { getEvents, type EventListResponse } from '@/lib/api'

type CatalogState =
  | { status: 'loading'; search: string }
  | { status: 'success'; search: string; data: EventListResponse }
  | { status: 'error'; search: string }

function EventCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search')?.trim() ?? ''
  const [retryKey, setRetryKey] = useState(0)
  const [catalog, setCatalog] = useState<CatalogState>({
    status: 'loading',
    search,
  })

  useEffect(() => {
    let ignore = false

    getEvents(search)
      .then((data) => {
        if (!ignore) setCatalog({ status: 'success', search, data })
      })
      .catch(() => {
        if (!ignore) setCatalog({ status: 'error', search })
      })

    return () => {
      ignore = true
    }
  }, [retryKey, search])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextSearch = String(formData.get('search') ?? '').trim()
    setCatalog({ status: 'loading', search: nextSearch })
    if (nextSearch === search) {
      setRetryKey((key) => key + 1)
    } else {
      setSearchParams(nextSearch ? { search: nextSearch } : {})
    }
  }

  function retry() {
    setCatalog({ status: 'loading', search })
    setRetryKey((key) => key + 1)
  }

  const isLoading = catalog.status === 'loading' || catalog.search !== search

  return (
    <main>
      <section className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            Каталог заходів
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Знайдіть подію, яку не хочеться пропустити
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Переглядайте актуальні заходи та перевіряйте наявність вільних місць.
          </p>

          <form
            className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
            onSubmit={submitSearch}
          >
            <label className="relative flex-1">
              <span className="sr-only">Пошук заходів</span>
              <Search
                className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                className="h-11 w-full rounded-md border bg-background pl-10 pr-3 outline-none transition-shadow focus:ring-2 focus:ring-ring"
                defaultValue={search}
                key={search}
                name="search"
                placeholder="Назва, опис або локація"
                type="search"
              />
            </label>
            <Button size="lg" type="submit">
              Знайти
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {isLoading && (
          <div
            className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"
            aria-live="polite"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Завантажуємо заходи…
          </div>
        )}

        {!isLoading && catalog.status === 'error' && (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
            <p className="font-medium">Не вдалося завантажити заходи.</p>
            <Button variant="outline" onClick={retry}>
              Спробувати ще раз
            </Button>
          </div>
        )}

        {!isLoading &&
          catalog.status === 'success' &&
          catalog.data.items.length === 0 && (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <CalendarX
                className="mb-4 size-10 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 className="text-xl font-semibold">Заходів не знайдено</h2>
              <p className="mt-2 text-muted-foreground">
                Спробуйте змінити пошуковий запит або поверніться пізніше.
              </p>
            </div>
          )}

        {!isLoading &&
          catalog.status === 'success' &&
          catalog.data.items.length > 0 && (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                Знайдено заходів: {catalog.data.total}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {catalog.data.items.map((event) => (
                  <EventCard event={event} key={event.slug} />
                ))}
              </div>
            </>
          )}
      </section>
    </main>
  )
}

export { EventCatalogPage }
