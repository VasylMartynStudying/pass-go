import { StatusPage } from '@/components/status-page'

function ForbiddenPage() {
  return (
    <StatusPage
      title="Немає доступу"
      description="Ця сторінка доступна лише власнику заходу або після входу організатора."
      actionTo="/organizer/login"
      actionLabel="Увійти як організатор"
    />
  )
}

export { ForbiddenPage }
