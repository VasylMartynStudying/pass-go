import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { EventSummary } from '@/lib/api'
import { formatEventDate } from '@/lib/date'

type EventCardProps = {
  event: EventSummary
}

function EventCard({ event }: EventCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="line-clamp-2 text-xl">{event.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <dl className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <dt className="sr-only">Дата</dt>
              <dd>{formatEventDate(event.starts_at)}</dd>
            </div>
          </div>
          <div className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <dt className="sr-only">Локація</dt>
              <dd>{event.location}</dd>
            </div>
          </div>
          <div className="flex gap-2">
            <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <dt className="sr-only">Вільні місця</dt>
              <dd>{event.available_seats} вільних місць</dd>
            </div>
          </div>
        </dl>

        <Button className="mt-auto w-full" asChild>
          <Link to={`/events/${event.slug}`}>Переглянути захід</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export { EventCard }
