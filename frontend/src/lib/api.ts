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

export type RegistrationResponse = {
  ticket_token: string
  full_name: string
  email: string
  event_title: string
  event_slug: string
}

export type TicketResponse = {
  ticket_token: string
  full_name: string
  event_title: string
  event_slug: string
  starts_at: string
  location: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export type OrganizerMe = {
  id: number
  email: string
  full_name: string
  is_admin: boolean
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let accessToken: string | null = null
let refreshRequest: Promise<string | null> | null = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

function errorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === 'object' &&
    'detail' in payload
  ) {
    const detail = payload.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
      return detail[0].msg
    }
  }

  return fallback
}

type ApiRequestOptions = RequestInit & {
  auth?: boolean
  retry?: boolean
}

function authHeaders(): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

async function parseError(response: Response) {
  const payload: unknown = await response.json().catch(() => null)
  return new ApiError(
    errorMessage(payload, 'Не вдалося виконати запит до сервера.'),
    response.status,
  )
}

export async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_URL}/auth/refresh/`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          setAccessToken(null)
          return null
        }

        const data = (await response.json()) as TokenResponse
        setAccessToken(data.access_token)
        return data.access_token
      })
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

export async function apiRequest<T>(
  path: string,
  init: ApiRequestOptions = {},
): Promise<T> {
  const { auth = false, retry = true, headers, ...rest } = init
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? authHeaders() : {}),
      ...headers,
    },
  })

  if (response.status === 401 && auth && retry && !path.startsWith('/auth/')) {
    const nextToken = await refreshAccessToken()
    if (nextToken) {
      return apiRequest<T>(path, { ...init, retry: false })
    }
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
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

export function registerForEvent(
  slug: string,
  payload: { full_name: string; email: string },
) {
  return apiRequest<RegistrationResponse>(
    `/public/events/${encodeURIComponent(slug)}/registrations/`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function getTicket(ticketToken: string) {
  return apiRequest<TicketResponse>(
    `/public/tickets/${encodeURIComponent(ticketToken)}/`,
  )
}

export async function loginOrganizer(email: string, password: string) {
  const tokens = await apiRequest<TokenResponse>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAccessToken(tokens.access_token)
  return tokens
}

export async function logoutOrganizer() {
  try {
    await apiRequest<void>('/auth/logout/', { method: 'POST' })
  } finally {
    setAccessToken(null)
  }
}

export function getCurrentOrganizer() {
  return apiRequest<OrganizerMe>('/auth/me/', { auth: true })
}
