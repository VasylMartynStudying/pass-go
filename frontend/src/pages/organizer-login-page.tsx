import { LoaderCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

function OrganizerLoginPage() {
  const { user, isReady, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/organizer'

  if (isReady && user) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await login(email, password)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Не вдалося увійти. Спробуйте ще раз.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Вхід організатора</CardTitle>
          <CardDescription>
            Увійдіть, щоб керувати своїми заходами.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Пароль
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
                  Входимо…
                </>
              ) : (
                'Увійти'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link className="underline-offset-4 hover:underline" to="/">
              Повернутися до каталогу
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

export { OrganizerLoginPage }
