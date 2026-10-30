import type { Initiative, InitiativeStatus } from '../types'

const dateFmt = new Intl.DateTimeFormat('sr-Latn-RS', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const timeFmt = new Intl.DateTimeFormat('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' })

export const formatDate = (iso: string) => dateFmt.format(new Date(iso))
export const formatTime = (iso: string) => timeFmt.format(new Date(iso))

export function formatWhen(i: Initiative): string {
  if (i.kind === 'permanent') return 'Trajna inicijativa'
  if (!i.startDate) return ''
  const start = formatDate(i.startDate)
  const t = formatTime(i.startDate)
  if (!i.endDate) return `${start}, ${t}`
  const end = formatDate(i.endDate)
  return start === end
    ? `${start}, ${t} – ${formatTime(i.endDate)}`
    : `${start} – ${end}`
}

export function getStatus(i: Initiative, now = new Date()): InitiativeStatus {
  if (i.cancelled) return 'cancelled'
  if (i.kind === 'permanent') return 'permanent'
  const start = i.startDate ? new Date(i.startDate) : now
  const end = i.endDate ? new Date(i.endDate) : start
  if (now < start) return 'upcoming'
  if (now <= end) return 'ongoing'
  return 'finished'
}

/** ISO vrednost za <input type="datetime-local"> (lokalno vreme) */
export const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
