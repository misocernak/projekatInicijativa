import type { CategoryId, InitiativeStatus } from '../types'
import { CITIES } from './cities'

export { CITIES }

export const BRAND = {
  name: 'Lepša Srbija',
  domain: 'lepsasrbija.com',
  tagline: 'Akcije u tvom gradu',
}

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'ciscenje', label: 'Čišćenje' },
  { id: 'zelenilo', label: 'Zelenilo i sadnja' },
  { id: 'uredjenje', label: 'Uređenje prostora' },
  { id: 'igraliste', label: 'Igrališta i parkovi' },
  { id: 'pomoc', label: 'Pomoć komšijama' },
  { id: 'zivotinje', label: 'Životinje' },
  { id: 'kultura', label: 'Kultura i druženje' },
]

export const STATUS_LABEL: Record<InitiativeStatus, string> = {
  upcoming: 'Predstoji',
  ongoing: 'U toku',
  finished: 'Završena',
  permanent: 'Trajna',
  cancelled: 'Otkazana',
}

export const cityName = (id: string) => CITIES.find((c) => c.id === id)?.name ?? id
export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id
