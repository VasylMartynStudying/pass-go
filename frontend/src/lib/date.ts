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
