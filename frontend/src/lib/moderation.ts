import type { EventStatus, ModerationStatus } from '@/lib/api'

const moderationLabels: Record<ModerationStatus, string> = {
  pending: 'Очікує модерації',
  approved: 'Схвалено',
  rejected: 'Відхилено',
}

function catalogVisibilityHint(event: {
  status: EventStatus
  moderation_status: ModerationStatus
  moderation_comment: string | null
}) {
  if (event.status === 'draft') {
    return 'Чернетка не потрапляє в публічний каталог.'
  }
  if (event.status === 'cancelled') {
    return 'Скасований захід приховано з каталогу.'
  }
  if (event.moderation_status === 'pending') {
    return 'Опубліковано, але з’явиться в каталозі лише після схвалення адміністратора.'
  }
  if (event.moderation_status === 'rejected') {
    return event.moderation_comment
      ? `Модерація відхилила публікацію: ${event.moderation_comment}`
      : 'Адміністратор відхилив публікацію в каталозі.'
  }
  return null
}

export { catalogVisibilityHint, moderationLabels }
