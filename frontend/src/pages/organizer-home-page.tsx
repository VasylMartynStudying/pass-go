import { CalendarPlus } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'

function OrganizerHomePage() {
  const { user } = useAuth()

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">
        Панель організатора
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Вітаємо, {user?.full_name}
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Тут з’являться ваші заходи, реєстрації та сканер квитків.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarPlus className="size-5" aria-hidden="true" />
            Мої заходи
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          CRUD заходів буде додано в наступному етапі.
        </CardContent>
      </Card>
    </main>
  )
}

export { OrganizerHomePage }
