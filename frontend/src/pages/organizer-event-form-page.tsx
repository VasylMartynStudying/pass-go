import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EventForm } from '@/components/event-form'
import { StatusPage } from '@/components/status-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createOrganizerEvent,
  getOrganizerEvent,
  updateOrganizerEvent,
  type OrganizerEvent,
  type OrganizerEventPayload,
} from '@/lib/api'

function OrganizerEventFormPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(slug)
  const [event, setEvent] = useState<OrganizerEvent | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    isEdit ? 'loading' : 'ready',
  )

  useEffect(() => {
    if (!slug) return

    let ignore = false
    getOrganizerEvent(slug)
      .then((data) => {
        if (!ignore) {
          setEvent(data)
          setLoadState('ready')
        }
      })
      .catch(() => {
        if (!ignore) setLoadState('error')
      })

    return () => {
      ignore = true
    }
  }, [slug])

  async function handleSubmit(payload: OrganizerEventPayload) {
    if (slug) {
      await updateOrganizerEvent(slug, payload)
      toast.success('Зміни збережено', {
        description: `«${payload.title}» оновлено.`,
      })
    } else {
      await createOrganizerEvent(payload)
      toast.success('Захід створено', {
        description: `«${payload.title}» додано до вашого списку.`,
      })
    }
    void navigate('/organizer')
  }

  if (loadState === 'loading') {
    return (
      <main className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        Завантажуємо захід…
      </main>
    )
  }

  if (loadState === 'error') {
    return (
      <StatusPage
        title="Захід не знайдено"
        description="Можливо, це чужа подія або її вже видалено."
        actionTo="/organizer"
        actionLabel="До моїх заходів"
      />
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">
        {isEdit ? 'Редагування' : 'Новий захід'}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {isEdit ? event?.title : 'Створити захід'}
      </h1>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Дані заходу</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            event={event ?? undefined}
            submitLabel={isEdit ? 'Зберегти зміни' : 'Створити захід'}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </main>
  )
}

export { OrganizerEventFormPage }
