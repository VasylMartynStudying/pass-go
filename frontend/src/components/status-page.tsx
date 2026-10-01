import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

type StatusPageProps = {
  title: string
  description: string
  actionTo?: string
  actionLabel?: string
  children?: ReactNode
}

function StatusPage({
  title,
  description,
  actionTo = '/',
  actionLabel = 'На головну',
  children,
}: StatusPageProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      {children}
      <Button className="mt-6" variant="outline" asChild>
        <Link to={actionTo}>{actionLabel}</Link>
      </Button>
    </main>
  )
}

export { StatusPage }
