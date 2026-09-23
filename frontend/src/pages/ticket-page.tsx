import { CalendarDays, Download, FileText, LoaderCircle, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ApiError, getTicket, type TicketResponse } from '@/lib/api'
import { formatEventDate } from '@/lib/date'
import { downloadQrPng, downloadTicketPdf, ticketQrValue } from '@/lib/ticket-export'

type TicketState =
  | { status: 'loading' }
  | { status: 'success'; ticket: TicketResponse }
  | { status: 'not-found' }
  | { status: 'error' }

function TicketPage() {
  const { ticketToken = '' } = useParams()
  const qrRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<TicketState>({ status: 'loading' })

  useEffect(() => {
    let ignore = false

    getTicket(ticketToken)
      .then((ticket) => {
        if (!ignore) setState({ status: 'success', ticket })
      })
      .catch((error: unknown) => {
        if (ignore) return
        setState({
          status:
            error instanceof ApiError && error.status === 404
              ? 'not-found'
              : 'error',
        })
      })

    return () => {
      ignore = true
    }
  }, [ticketToken])

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        Завантажуємо квиток…
      </main>
    )
  }

  if (state.status === 'not-found' || state.status === 'error') {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold">
          {state.status === 'not-found'
            ? 'Квиток не знайдено'
            : 'Не вдалося завантажити квиток'}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Перевірте посилання або зареєструйтеся на захід ще раз.
        </p>
        <Button className="mt-6" variant="outline" asChild>
          <Link to="/">До каталогу</Link>
        </Button>
      </main>
    )
  }

  const ticket = state.ticket
  const qrValue = ticketQrValue(ticket.ticket_token)
  const fileBase = `passgo-${ticket.event_slug}`

  function handlePngDownload() {
    if (!qrRef.current) return
    downloadQrPng(qrRef.current, `${fileBase}.png`)
  }

  function handlePdfDownload() {
    if (!qrRef.current) return
    void downloadTicketPdf(
      qrRef.current,
      {
        eventTitle: ticket.event_title,
        fullName: ticket.full_name,
        startsAt: formatEventDate(ticket.starts_at),
        location: ticket.location,
      },
      `${fileBase}.pdf`,
    )
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-8 sm:px-6 sm:py-12">
      <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-primary">
        Ваш квиток
      </p>
      <h1 className="text-center text-3xl font-bold tracking-tight">
        {ticket.event_title}
      </h1>
      <p className="mt-2 text-center text-muted-foreground">{ticket.full_name}</p>

      <Card className="mt-8 print:shadow-none">
        <CardContent className="space-y-6 pt-6">
          <dl className="space-y-3 text-sm">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="sr-only">Дата</dt>
                <dd>{formatEventDate(ticket.starts_at)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="sr-only">Локація</dt>
                <dd>{ticket.location}</dd>
              </div>
            </div>
          </dl>

          <div className="flex justify-center rounded-xl border bg-white p-4">
            <QRCodeCanvas
              ref={qrRef}
              value={qrValue}
              size={240}
              marginSize={2}
              title="QR-код квитка"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 print:hidden">
            <Button variant="outline" onClick={handlePngDownload}>
              <Download className="size-4" aria-hidden="true" />
              Зберегти PNG
            </Button>
            <Button onClick={handlePdfDownload}>
              <FileText className="size-4" aria-hidden="true" />
              Завантажити PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button className="mt-6 print:hidden" variant="outline" asChild>
        <Link to={`/events/${ticket.event_slug}`}>Повернутися до заходу</Link>
      </Button>
    </main>
  )
}

export { TicketPage }
