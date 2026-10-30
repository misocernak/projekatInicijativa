/**
 * API sloj. Trenutno radi nad mock podacima i localStorage-om.
 * Kada back (PHP) bude spreman, menja se samo implementacija ovih funkcija
 * (fetch ka /api/...), a stranice ostaju iste.
 */
import { MOCK_INITIATIVES } from '../data/mock'
import { getStatus } from '../lib/dates'
import type { Initiative, InitiativeFilters, NewInitiative, User } from '../types'

const KEYS = {
  created: 'zajedno.created',
  joined: 'zajedno.joined',
  user: 'zajedno.user',
  cancelled: 'zajedno.cancelled',
}

const delay = <T>(v: T, ms = 150) => new Promise<T>((r) => setTimeout(() => r(v), ms))

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* privatni režim ili pun storage: demo radi i bez čuvanja */
  }
}

function all(): Initiative[] {
  const cancelled = read<string[]>(KEYS.cancelled, [])
  return [...read<Initiative[]>(KEYS.created, []), ...MOCK_INITIATIVES].map((i) => ({
    ...i,
    cancelled: i.cancelled || cancelled.includes(i.id),
  }))
}

const joinedIds = () => read<string[]>(KEYS.joined, [])

/** Ukupan broj prijavljenih, uključujući trenutnog korisnika. */
export function participantCount(i: Initiative) {
  return i.participants + (joinedIds().includes(i.id) ? 1 : 0)
}

export async function listInitiatives(f: InitiativeFilters = {}): Promise<Initiative[]> {
  const q = f.query?.trim().toLowerCase()
  const result = all()
    .filter((i) => !f.cityId || i.cityId === f.cityId)
    .filter((i) => !f.category || i.category === f.category)
    .filter((i) => !f.status || getStatus(i) === f.status)
    .filter((i) => !q || `${i.title} ${i.description} ${i.address}`.toLowerCase().includes(q))
    .sort((a, b) => {
      // trajne na kraj, a vremenske po datumu početka
      const da = a.startDate ? +new Date(a.startDate) : Infinity
      const db = b.startDate ? +new Date(b.startDate) : Infinity
      return da - db
    })
  return delay(result)
}

export async function getInitiative(id: string): Promise<Initiative | undefined> {
  return delay(all().find((i) => i.id === id))
}

export async function createInitiative(data: NewInitiative, user: User): Promise<Initiative> {
  const item: Initiative = {
    ...data,
    id: `c${Date.now()}`,
    participants: 0,
    organizerId: user.id,
    organizerName: user.name,
  }
  write(KEYS.created, [item, ...read<Initiative[]>(KEYS.created, [])])
  return delay(item)
}

export async function cancelInitiative(id: string) {
  write(KEYS.cancelled, [...read<string[]>(KEYS.cancelled, []), id])
  return delay(true)
}

export async function toggleJoin(id: string): Promise<boolean> {
  const ids = joinedIds()
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
  write(KEYS.joined, next)
  return delay(next.includes(id), 100)
}

export const isJoined = (id: string) => joinedIds().includes(id)

export async function listJoined(): Promise<Initiative[]> {
  const ids = joinedIds()
  return delay(all().filter((i) => ids.includes(i.id)))
}

export async function listMine(userId: string): Promise<Initiative[]> {
  return delay(all().filter((i) => i.organizerId === userId))
}

/* ---- Autentikacija (mock: bilo koja prijava prolazi) ---- */

export const getStoredUser = () => read<User | null>(KEYS.user, null)

export async function register(name: string, email: string, cityId?: string): Promise<User> {
  const user: User = { id: `u-${Date.now()}`, name, email, cityId }
  write(KEYS.user, user)
  return delay(user)
}

export async function login(email: string): Promise<User> {
  const user = getStoredUser() ?? {
    id: `u-${Date.now()}`,
    name: email.split('@')[0],
    email,
  }
  write(KEYS.user, user)
  return delay(user)
}

export function logout() {
  try {
    localStorage.removeItem(KEYS.user)
  } catch {
    /* ignore */
  }
}
