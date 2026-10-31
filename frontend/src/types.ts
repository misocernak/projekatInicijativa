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

export type ParticipationStatus = 'pending' | 'confirmed' | 'cancelled'

/** Odnos prijavljenog korisnika prema akciji (API ga dodaje samo prijavljenima). */
export interface Viewer {
  isOrganizer: boolean
  participation: ParticipationStatus | null
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
  /** 'timed' ima početak i kraj, 'permanent' je trajna akcija */
  kind: 'timed' | 'permanent'
  startDate?: string
  endDate?: string
  capacity?: number
  /** broj potvrđenih prijava */
  participants: number
  bring?: string
  organizerId: string
  organizerName: string
  contact?: string
  /** pun URL slike; bez nje se prikazuje ilustracija kategorije */
  image?: string
  cancelled?: boolean
  /** sakrivena sa javne liste (vide je samo organizator i admin) */
  hidden?: boolean
  viewer?: Viewer
  /** rezultat završene akcije ("Uradili smo"), kada ga je organizator objavio */
  result?: ActionResult
}

export interface ActionResult {
  text: string
  /** slika pre (opciono) i posle */
  before?: string
  after?: string
  publishedAt: string
}

export type InitiativeStatus = 'upcoming' | 'ongoing' | 'finished' | 'permanent' | 'cancelled'

export interface User {
  id: string
  name: string
  email: string
  cityId?: string
  emailVerified: boolean
  role: string
}

export interface InitiativeFilters {
  cityId?: string
  category?: CategoryId
  status?: InitiativeStatus
  query?: string
}

/** Podaci iz forme za novu akciju (slika se šalje posebno, kao fajl). */
export type NewInitiative = Omit<
  Initiative,
  'id' | 'participants' | 'organizerId' | 'organizerName' | 'cancelled' | 'hidden' | 'viewer' | 'image'
>
