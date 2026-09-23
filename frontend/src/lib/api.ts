const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export type HealthResponse = {
  status: 'ok'
  service: string
  timestamp: string
}

export type EventSummary = {
  slug: string
  title: string
  starts_at: string
  location: string
  capacity: number
  occupied_seats: number
  available_seats: number
}

export type EventDetail = EventSummary & {
  description: string
}

export type EventListResponse = {
  items: EventSummary[]
  total: number
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError('Не вдалося виконати запит до сервера.', response.status)
  }

  return response.json() as Promise<T>
}

export function getHealth() {
  return apiRequest<HealthResponse>('/health/')
}

export function getEvents(search?: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const query = params.size ? `?${params.toString()}` : ''

  return apiRequest<EventListResponse>(`/public/events${query}`)
}

export function getEvent(slug: string) {
  return apiRequest<EventDetail>(`/public/events/${encodeURIComponent(slug)}`)
}
