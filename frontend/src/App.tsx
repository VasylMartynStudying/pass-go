import { CalendarDays, CircleCheck, CircleX, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getHealth, type HealthResponse } from '@/lib/api'

type HealthState =
  | { status: 'loading' }
  | { status: 'online'; data: HealthResponse }
  | { status: 'offline' }

function HomePage() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })

  async function checkBackend() {
    setHealth({ status: 'loading' })

    try {
      const data = await getHealth()
      setHealth({ status: 'online', data })
    } catch {
      setHealth({ status: 'offline' })
    }
  }

  useEffect(() => {
    let ignore = false

    getHealth()
      .then((data) => {
        if (!ignore) setHealth({ status: 'online', data })
      })
      .catch(() => {
        if (!ignore) setHealth({ status: 'offline' })
      })

    return () => {
      ignore = true
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarDays aria-hidden="true" />
          </div>
          <CardTitle>PassGo</CardTitle>
          <CardDescription>
            Платформа реєстрації учасників заходів
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4"
            aria-live="polite"
          >
            {health.status === 'loading' && (
              <>
                <LoaderCircle
                  className="size-5 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <span>Перевіряємо з’єднання з API…</span>
              </>
            )}

            {health.status === 'online' && (
              <>
                <CircleCheck
                  className="size-5 text-emerald-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Backend доступний</p>
                  <p className="text-sm text-muted-foreground">
                    Сервіс: {health.data.service}
                  </p>
                </div>
              </>
            )}

            {health.status === 'offline' && (
              <>
                <CircleX
                  className="size-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div className="flex flex-1 items-center justify-between gap-4">
                  <p className="text-sm">Backend зараз недоступний.</p>
                  <Button size="sm" variant="outline" onClick={checkBackend}>
                    Повторити
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}

export default App
