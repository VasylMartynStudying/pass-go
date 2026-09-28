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

export type EventStatus = 'draft' | 'published' | 'cancelled'

export type OrganizerEvent = {
  slug: string
  title: string
  description: string
  starts_at: string
  location: string
  capacity: number
  status: EventStatus
  occupied_seats: number
  available_seats: number
}

export type OrganizerEventListResponse = {
  items: OrganizerEvent[]
  total: number
}

export type OrganizerEventPayload = {
  title: string
  description: string
  starts_at: string
  location: string
  capacity: number
  status: EventStatus
}

export type Attendee = {
  full_name: string
  email: string
  registered_at: string
  checked_in_at: string | null
  is_checked_in: boolean
}

export type EventDashboardResponse = {
  event: OrganizerEvent
  checked_in_count: number
  attendees: Attendee[]
  attendees_total: number
  limit: number
  offset: number
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

export function getOrganizerEvents() {
  return apiRequest<OrganizerEventListResponse>('/organizer/events/', {
    auth: true,
  })
}

export function getOrganizerEvent(slug: string) {
  return apiRequest<OrganizerEvent>(
    `/organizer/events/${encodeURIComponent(slug)}/`,
    { auth: true },
  )
}

export function createOrganizerEvent(payload: OrganizerEventPayload) {
  return apiRequest<OrganizerEvent>('/organizer/events/', {
    auth: true,
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateOrganizerEvent(
  slug: string,
  payload: OrganizerEventPayload,
) {
  return apiRequest<OrganizerEvent>(
    `/organizer/events/${encodeURIComponent(slug)}/`,
    {
      auth: true,
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )
}

export function deleteOrganizerEvent(slug: string) {
  return apiRequest<void>(`/organizer/events/${encodeURIComponent(slug)}/`, {
    auth: true,
    method: 'DELETE',
  })
}

type AttendeeQuery = {
  search?: string
  checkedIn?: 'all' | 'yes' | 'no'
  offset?: number
  limit?: number
}

function attendeeQuery(params?: AttendeeQuery) {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.checkedIn === 'yes') query.set('checked_in', 'true')
  if (params?.checkedIn === 'no') query.set('checked_in', 'false')
  if (params?.offset) query.set('offset', String(params.offset))
  if (params?.limit) query.set('limit', String(params.limit))
  return query.size ? `?${query.toString()}` : ''
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback
  const utfMatch = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1])
    } catch {
      return fallback
    }
  }
  const asciiMatch = header.match(/filename="([^"]+)"/i)
  return asciiMatch?.[1] || fallback
}

export function getEventDashboard(slug: string, params?: AttendeeQuery) {
  return apiRequest<EventDashboardResponse>(
    `/organizer/events/${encodeURIComponent(slug)}/dashboard/${attendeeQuery(params)}`,
    { auth: true },
  )
}

export async function downloadEventAttendeesCsv(
  slug: string,
  params?: Pick<AttendeeQuery, 'search' | 'checkedIn'>,
) {
  const path = `/organizer/events/${encodeURIComponent(slug)}/attendees.csv/${attendeeQuery(params)}`

  async function request(retry: boolean) {
    const response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: authHeaders(),
    })
    if (response.status === 401 && retry) {
      const nextToken = await refreshAccessToken()
      if (nextToken) return request(false)
    }
    return response
  }

  const response = await request(true)
  if (!response.ok) {
    throw await parseError(response)
  }

  const blob = await response.blob()
  const filename = filenameFromDisposition(
    response.headers.get('Content-Disposition'),
    `${slug}-participants.csv`,
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
