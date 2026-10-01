import { StatusPage } from '@/components/status-page'

function NotFoundPage() {
  return (
    <StatusPage
      title="Сторінку не знайдено"
      description="Такої адреси немає. Перевірте посилання або поверніться до каталогу."
      actionLabel="До каталогу"
    />
  )
}

export { NotFoundPage }
