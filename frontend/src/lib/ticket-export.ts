export function ticketQrValue(ticketToken: string) {
  return `${window.location.origin}/tickets/${ticketToken}`
}

export function downloadQrPng(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = filename
  link.click()
}

type TicketPdfData = {
  eventTitle: string
  fullName: string
  startsAt: string
  location: string
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines
}

export async function downloadTicketPdf(
  qrCanvas: HTMLCanvasElement,
  ticket: TicketPdfData,
  filename: string,
) {
  const width = 630
  const height = 888
  const sheet = document.createElement('canvas')
  sheet.width = width
  sheet.height = height

  const context = sheet.getContext('2d')
  if (!context) return

  context.fillStyle = '#f8fafc'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = '#2563eb'
  context.lineWidth = 6
  context.strokeRect(24, 24, width - 48, height - 48)

  context.fillStyle = '#2563eb'
  context.font = '700 28px Inter, sans-serif'
  context.textAlign = 'center'
  context.fillText('PassGo', width / 2, 90)

  context.fillStyle = '#0f172a'
  context.font = '700 36px Inter, sans-serif'
  const titleLines = wrapText(context, ticket.eventTitle, width - 120)
  titleLines.forEach((line, index) => {
    context.fillText(line, width / 2, 150 + index * 44)
  })

  context.fillStyle = '#475569'
  context.font = '400 24px Inter, sans-serif'
  const detailsStart = 170 + titleLines.length * 44
  context.fillText(ticket.fullName, width / 2, detailsStart)
  context.fillText(ticket.startsAt, width / 2, detailsStart + 40)
  wrapText(context, ticket.location, width - 120).forEach((line, index) => {
    context.fillText(line, width / 2, detailsStart + 80 + index * 34)
  })

  const qrSize = 320
  context.drawImage(qrCanvas, (width - qrSize) / 2, 500, qrSize, qrSize)

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [105, 148],
  })
  pdf.addImage(sheet.toDataURL('image/png'), 'PNG', 0, 0, 105, 148)
  pdf.save(filename)
}
