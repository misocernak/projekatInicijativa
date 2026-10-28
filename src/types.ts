export type CategoryId =
  | 'ciscenje'
  | 'zelenilo'
  | 'uredjenje'
  | 'igraliste'
  | 'pomoc'
  | 'zivotinje'
  | 'kultura'

export interface City {
  id: string
  name: string
  lat: number
  lng: number
}

export interface Initiative {
  id: string
  title: string
  description: string
  category: CategoryId
  cityId: string
  address: string
  lat: number
  lng: number
  /** 'timed' ima početak i kraj, 'permanent' je trajna inicijativa */
  kind: 'timed' | 'permanent'
  startDate?: string
  endDate?: string
  capacity?: number
  /** broj već prijavljenih (bez trenutnog korisnika) */
  participants: number
  bring?: string
  organizerId: string
  organizerName: string
  contact?: string
  cancelled?: boolean
}

export type InitiativeStatus = 'upcoming' | 'ongoing' | 'finished' | 'permanent' | 'cancelled'

export interface User {
  id: string
  name: string
  email: string
  cityId?: string
}

export interface InitiativeFilters {
  cityId?: string
  category?: CategoryId
  status?: InitiativeStatus
  query?: string
}

export type NewInitiative = Omit<
  Initiative,
  'id' | 'participants' | 'organizerId' | 'organizerName' | 'cancelled'
>
