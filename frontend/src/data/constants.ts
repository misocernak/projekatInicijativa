import type { CategoryId, City, InitiativeStatus } from '../types'

export const BRAND = {
  name: 'Zajedno',
  tagline: 'Inicijative u tvom gradu',
}

export const CITIES: City[] = [
  { id: 'beograd', name: 'Beograd', lat: 44.8125, lng: 20.4612 },
  { id: 'novi-sad', name: 'Novi Sad', lat: 45.2671, lng: 19.8335 },
  { id: 'nis', name: 'Niš', lat: 43.3209, lng: 21.8958 },
  { id: 'kragujevac', name: 'Kragujevac', lat: 44.0128, lng: 20.9114 },
  { id: 'subotica', name: 'Subotica', lat: 46.1, lng: 19.6667 },
  { id: 'cacak', name: 'Čačak', lat: 43.8914, lng: 20.3497 },
  { id: 'kraljevo', name: 'Kraljevo', lat: 43.7258, lng: 20.6894 },
  { id: 'pancevo', name: 'Pančevo', lat: 44.8708, lng: 20.6403 },
  { id: 'zrenjanin', name: 'Zrenjanin', lat: 45.3816, lng: 20.3903 },
  { id: 'uzice', name: 'Užice', lat: 43.8556, lng: 19.8425 },
]

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'ciscenje', label: 'Čišćenje' },
  { id: 'zelenilo', label: 'Zelenilo i sadnja' },
  { id: 'uredjenje', label: 'Uređenje prostora' },
  { id: 'igraliste', label: 'Igrališta i parkovi' },
  { id: 'pomoc', label: 'Pomoć sugrađanima' },
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
