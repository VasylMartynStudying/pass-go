import { ScanLine } from 'lucide-react'
import { lazy, Suspense, type FormEvent, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ApiError, checkInAttendee, type CheckInResponse } from '@/lib/api'
import { formatEventDate } from '@/lib/date'
import { parseTicketToken } from '@/lib/ticket-export'

const QrScanner = lazy(() =>
  import('@/components/qr-scanner').then((module) => ({
    default: module.QrScanner,
  })),
)

type ScanResult =
  | { kind: 'success'; data: CheckInResponse }
  | { kind: 'error'; message: string }

function OrganizerScanPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const inFlightRef = useRef(false)

  async function submitToken(raw: string) {
    const token = parseTicketToken(raw)
    if (!token || inFlightRef.current) return

    inFlightRef.current = true
    setIsScanning(false)
    setIsSubmitting(true)
    setResult(null)

    try {
      const data = await checkInAttendee(token)
      setResult({ kind: 'success', data })
    } catch (error: unknown) {
      setResult({
        kind: 'error',
        message:
          error instanceof ApiError
            ? error.message
            : 'Не вдалося виконати check-in.',
      })
    } finally {
      inFlightRef.current = false
      setIsSubmitting(false)
    }
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const value = String(formData.get('ticket') ?? '')
    void submitToken(value)
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">
        Check-in
      </p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
        <ScanLine className="size-8" aria-hidden="true" />
        Сканер квитків
      </h1>
      <p className="mt-3 text-muted-foreground">
        Наведіть камеру на QR квитка. Після зчитування сканування зупиниться —
        натисніть «Сканувати ще», щоб перевірити наступного гостя.
      </p>

      {result?.kind === 'success' && (
        <Card className="mt-6 border-emerald-600 bg-emerald-50 text-emerald-950">
          <CardHeader>
            <CardTitle className="text-xl">Гостя пропущено</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1" aria-live="polite">
            <p className="text-2xl font-semibold">{result.data.full_name}</p>
            <p>{result.data.event_title}</p>
            <p className="text-sm">
              {formatEventDate(result.data.checked_in_at)}
            </p>
            <Button className="mt-4" asChild variant="outline">
              <Link to={`/organizer/events/${result.data.event_slug}`}>
                Відкрити дашборд
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {result?.kind === 'error' && (
        <Card className="mt-6 border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-xl text-destructive">
              Квиток не прийнято
            </CardTitle>
          </CardHeader>
          <CardContent aria-live="assertive" id="scan-error">
            <p>{result.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {isScanning ? (
          <Button variant="outline" onClick={() => setIsScanning(false)}>
            Вимкнути камеру
          </Button>
        ) : (
          <Button
            disabled={isSubmitting}
            onClick={() => {
              setResult(null)
              setIsScanning(true)
            }}
          >
            {result ? 'Сканувати ще' : 'Увімкнути камеру'}
          </Button>
        )}
      </div>

      {isScanning && (
        <div className="mt-6">
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">
                Завантажуємо сканер…
              </p>
            }
          >
            <QrScanner onDecode={(value) => void submitToken(value)} />
          </Suspense>
        </div>
      )}

      {isSubmitting && (
        <p className="mt-4 text-sm text-muted-foreground">Перевіряємо квиток…</p>
      )}

      <form className="mt-8 space-y-3" onSubmit={handleManualSubmit}>
        <label className="block text-sm font-medium" htmlFor="ticket">
          Або вставте посилання квитка
        </label>
        <Input
          id="ticket"
          name="ticket"
          autoComplete="off"
          inputMode="url"
          placeholder="https://…/tickets/…"
          disabled={isSubmitting}
          aria-invalid={result?.kind === 'error'}
          aria-describedby={result?.kind === 'error' ? 'scan-error' : undefined}
        />
        <Button type="submit" variant="outline" disabled={isSubmitting} aria-busy={isSubmitting}>
          Перевірити
        </Button>
      </form>
    </main>
  )
}

export { OrganizerScanPage }
