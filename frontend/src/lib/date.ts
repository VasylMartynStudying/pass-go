const eventDateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatEventDate(value: string) {
  return eventDateFormatter.format(new Date(value))
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function toDateTimeLocal(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDateTimeLocal(value: string) {
  return new Date(value).toISOString()
}
