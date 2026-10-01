import { LoaderCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ApiError,
  type EventStatus,
  type OrganizerEvent,
  type OrganizerEventPayload,
} from '@/lib/api'
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/date'

const statusOptions: { value: EventStatus; label: string }[] = [
  { value: 'draft', label: 'Чернетка' },
  { value: 'published', label: 'Опубліковано' },
  { value: 'cancelled', label: 'Скасовано' },
]

type EventFormProps = {
  event?: OrganizerEvent
  submitLabel: string
  onSubmit: (payload: OrganizerEventPayload) => Promise<void>
}

function EventForm({ event, submitLabel, onSubmit }: EventFormProps) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [startsAt, setStartsAt] = useState(
    event ? toDateTimeLocal(event.starts_at) : '',
  )
  const [location, setLocation] = useState(event?.location ?? '')
  const [capacity, setCapacity] = useState(String(event?.capacity ?? 50))
  const [status, setStatus] = useState<EventStatus>(event?.status ?? 'draft')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        title,
        description,
        starts_at: fromDateTimeLocal(startsAt),
        location,
        capacity: Number(capacity),
        status,
      })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Не вдалося зберегти захід.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="title">
          Назва
        </label>
        <Input
          id="title"
          minLength={3}
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="description">
          Опис
        </label>
        <Textarea
          id="description"
          minLength={10}
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="starts-at">
            Дата і час
          </label>
          <Input
            id="starts-at"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="capacity">
            Місткість
          </label>
          <Input
            id="capacity"
            min={event?.occupied_seats ?? 1}
            required
            type="number"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="location">
          Локація
        </label>
        <Input
          id="location"
          minLength={2}
          required
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="status">
          Статус
        </label>
        <select
          id="status"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          value={status}
          onChange={(event) => setStatus(event.target.value as EventStatus)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          Опублікований захід з’явиться в каталозі лише після схвалення
          адміністратора.
        </p>
      </div>

      {event && (
        <p className="text-sm text-muted-foreground">
          Зареєстровано учасників: {event.occupied_seats}. Місткість не можна
          зменшити нижче цієї кількості.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Зберігаємо…
            </>
          ) : (
            submitLabel
          )}
        </Button>
        <Button variant="outline" type="button" asChild>
          <Link to="/organizer">Скасувати</Link>
        </Button>
      </div>
    </form>
  )
}

export { EventForm }
