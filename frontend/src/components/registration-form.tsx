import { LoaderCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ApiError,
  registerForEvent,
  type EventDetail,
  type RegistrationResponse,
} from '@/lib/api'

type RegistrationFormProps = {
  event: EventDetail
  onRegistered: (registration: RegistrationResponse) => void
}

function RegistrationForm({ event, onRegistered }: RegistrationFormProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFull = event.available_seats <= 0

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (isSubmitting || isFull) return

    setIsSubmitting(true)
    setError(null)

    try {
      const registration = await registerForEvent(event.slug, {
        full_name: fullName,
        email,
      })
      onRegistered(registration)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Не вдалося завершити реєстрацію.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isFull) {
    return (
      <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
        Усі місця вже зайняті.
      </p>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="full-name">
          Ім’я та прізвище
        </label>
        <Input
          id="full-name"
          name="full_name"
          autoComplete="name"
          minLength={2}
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Реєструємо…
          </>
        ) : (
          'Зареєструватися'
        )}
      </Button>
    </form>
  )
}

export { RegistrationForm }
