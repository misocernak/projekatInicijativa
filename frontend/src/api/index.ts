/**
 * Klijent za backend (Laravel API na istom domenu, /api).
 * Prijava radi preko sesije (kolačić) uz CSRF zaštitu: pre prvog pisanja traži se XSRF kolačić,
 * a njegova vrednost se šalje u zaglavlju X-XSRF-TOKEN.
 */
import type {
  Initiative,
  InitiativeFilters,
  NewInitiative,
  ParticipationStatus,
  User,
} from '../types'

const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** Prva poruka greške za polje, ili opšta poruka. */
export function errorText(e: unknown, field?: string): string {
  if (e instanceof ApiError) {
    if (field && e.fieldErrors[field]?.[0]) return e.fieldErrors[field][0]
    const first = Object.values(e.fieldErrors)[0]?.[0]
    return first ?? e.message
  }
  return 'Došlo je do greške. Proveri vezu i pokušaj ponovo.'
}

function xsrfToken(): string | undefined {
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : undefined
}

async function ensureCsrf(force = false) {
  if (!force && xsrfToken()) return
  await fetch(`${BASE}/sanctum/csrf-cookie`, { credentials: 'include' })
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function request<T>(method: Method, path: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let payload: BodyInit | undefined

  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  if (method !== 'GET') {
    await ensureCsrf()
    const token = xsrfToken()
    if (token) headers['X-XSRF-TOKEN'] = token
  }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload, credentials: 'include' })
  } catch {
    throw new ApiError(0, 'Nema veze sa serverom. Proveri internet i pokušaj ponovo.')
  }

  // 419: istekao CSRF token ili sesija; jednom osveži kolačić i ponovi
  if (res.status === 419 && retry) {
    await ensureCsrf(true)
    return request<T>(method, path, body, false)
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let json: unknown = undefined
  try {
    json = text ? JSON.parse(text) : undefined
  } catch {
    /* odgovor nije JSON */
  }

  if (!res.ok) {
    const data = (json ?? {}) as { message?: string; errors?: Record<string, string[]> }
    throw new ApiError(res.status, data.message ?? friendly(res.status), data.errors ?? {})
  }

  return json as T
}

function friendly(status: number): string {
  if (status === 401) return 'Potrebna je prijava.'
  if (status === 403) return 'Nemaš dozvolu za ovu radnju.'
  if (status === 404) return 'Nije pronađeno.'
  if (status === 429) return 'Previše pokušaja. Sačekaj malo pa pokušaj ponovo.'
  return 'Došlo je do greške na serveru. Pokušaj ponovo.'
}

/* ---------------- Inicijative ---------------- */

interface Wrapped<T> {
  data: T
}

export async function listInitiatives(f: InitiativeFilters = {}): Promise<Initiative[]> {
  const p = new URLSearchParams({ per_page: '50' })
  if (f.cityId) p.set('city', f.cityId)
  if (f.category) p.set('category', f.category)
  if (f.status) p.set('status', f.status)
  if (f.query?.trim()) p.set('q', f.query.trim())
  return (await request<Wrapped<Initiative[]>>('GET', `/initiatives?${p}`)).data
}

export async function getInitiative(id: string): Promise<Initiative | undefined> {
  try {
    return (await request<Wrapped<Initiative>>('GET', `/initiatives/${encodeURIComponent(id)}`)).data
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return undefined
    throw e
  }
}

export async function createInitiative(data: NewInitiative, image?: Blob): Promise<Initiative> {
  const form = new FormData()
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') form.append(key, String(value))
  }
  if (image) form.append('image', image, 'slika.jpg')
  return (await request<Wrapped<Initiative>>('POST', '/initiatives', form)).data
}

export async function cancelInitiative(id: string): Promise<Initiative> {
  return (await request<Wrapped<Initiative>>('POST', `/initiatives/${id}/cancel`)).data
}

export async function listMine(): Promise<Initiative[]> {
  return (await request<Wrapped<Initiative[]>>('GET', '/me/initiatives')).data
}

export async function listJoined(): Promise<Initiative[]> {
  return (await request<Wrapped<Initiative[]>>('GET', '/me/participations')).data
}

/* ---------------- Prijava na inicijativu ---------------- */

export interface JoinResult {
  status: ParticipationStatus
  /** false ako server nije uspeo da pošalje mejl (npr. mejl još nije podešen) */
  mailSent?: boolean
}

export interface GuestJoin {
  name: string
  email: string
  consent: boolean
}

export function join(id: string, guest?: GuestJoin): Promise<JoinResult> {
  return request<JoinResult>('POST', `/initiatives/${id}/join`, guest ?? {})
}

export function leave(id: string): Promise<{ status: string }> {
  return request('DELETE', `/initiatives/${id}/join`)
}

/* ---------------- Nalog ---------------- */

export async function getMe(): Promise<User | null> {
  try {
    return (await request<{ user: User }>('GET', '/me')).user
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

export interface RegisterData {
  name: string
  email: string
  password: string
  password_confirmation: string
  city?: string
  consent: boolean
}

export async function register(data: RegisterData): Promise<{ user: User; verificationEmailSent: boolean }> {
  return request('POST', '/register', data)
}

export async function login(email: string, password: string): Promise<User> {
  return (await request<{ user: User }>('POST', '/login', { email, password })).user
}

export function logout(): Promise<unknown> {
  return request('POST', '/logout')
}

export function resendVerification(): Promise<{ status: 'sent' | 'failed' | 'already-verified' }> {
  return request('POST', '/email/verification-notification')
}

export function forgotPassword(email: string): Promise<unknown> {
  return request('POST', '/forgot-password', { email })
}

export function resetPassword(data: {
  token: string
  email: string
  password: string
  password_confirmation: string
}): Promise<unknown> {
  return request('POST', '/reset-password', data)
}

/* ---------------- Izmena inicijative, prijavljeni, moderacija ---------------- */

export async function updateInitiative(id: string, data: NewInitiative): Promise<Initiative> {
  return (await request<Wrapped<Initiative>>('PUT', `/initiatives/${id}`, data)).data
}

export async function uploadInitiativeImage(id: string, image: Blob): Promise<Initiative> {
  const form = new FormData()
  form.append('image', image, 'slika.jpg')
  return (await request<Wrapped<Initiative>>('POST', `/initiatives/${id}/image`, form)).data
}

export async function deleteInitiativeImage(id: string): Promise<Initiative> {
  return (await request<Wrapped<Initiative>>('DELETE', `/initiatives/${id}/image`)).data
}

export interface ParticipantRow {
  name: string
  status: ParticipationStatus
  joinedAt: string
}

/** Spisak prijavljenih (samo organizator): imena, bez mejl adresa. */
export async function listParticipants(id: string): Promise<ParticipantRow[]> {
  return (await request<Wrapped<ParticipantRow[]>>('GET', `/initiatives/${id}/participants`)).data
}

export type ReportReason = 'spam' | 'neprikladno' | 'lazno' | 'bezbednost' | 'drugo'

export function reportInitiative(id: string, data: { reason: ReportReason; message?: string; email?: string }): Promise<unknown> {
  return request('POST', `/initiatives/${id}/report`, data)
}

export interface AdminReport {
  id: number
  reason: ReportReason
  message: string | null
  status: 'open' | 'resolved'
  createdAt: string
  reporter: { name: string | null; email: string } | null
  initiative: { id: string; title: string; hidden: boolean; organizerName: string }
}

export async function adminReports(status: 'open' | 'resolved' | 'all' = 'open'): Promise<AdminReport[]> {
  return (await request<Wrapped<AdminReport[]>>('GET', `/admin/reports?status=${status}`)).data
}

export function adminResolveReport(id: number): Promise<unknown> {
  return request('POST', `/admin/reports/${id}/resolve`)
}

export function adminHideInitiative(id: string): Promise<unknown> {
  return request('POST', `/admin/initiatives/${id}/hide`)
}

export function adminUnhideInitiative(id: string): Promise<unknown> {
  return request('POST', `/admin/initiatives/${id}/unhide`)
}
