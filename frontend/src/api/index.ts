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
import { captcha } from '../lib/captcha'

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

/** Rute koje štiti Cloudflare Turnstile (vidi backend/routes/api.php). */
const PROTECTED = /^\/(register|login|forgot-password|initiatives\/[^/]+\/(join|report))$/

async function request<T>(method: Method, path: string, body?: unknown, retry = true, botToken?: string | null): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let payload: BodyInit | undefined

  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  if (method === 'POST' && PROTECTED.test(path)) {
    botToken = botToken === undefined ? await captcha.take() : botToken
    if (botToken) headers['X-Turnstile-Token'] = botToken
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
    return request<T>(method, path, body, false, botToken)
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

/* ---------------- Akcije ---------------- */

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

/* ---------------- Realizovano (rezultati završenih akcija) ---------------- */

export interface ResultsPage {
  stats: { actions: number; volunteers: number; cities: number }
  data: Initiative[]
  meta: { page: number; lastPage: number; total: number }
}

export function listResults(f: { city?: string; category?: string; perPage?: number } = {}): Promise<ResultsPage> {
  const p = new URLSearchParams()
  if (f.city) p.set('city', f.city)
  if (f.category) p.set('category', f.category)
  if (f.perPage) p.set('per_page', String(f.perPage))
  return request('GET', `/results${p.size ? `?${p}` : ''}`)
}

export async function publishResult(id: string, data: { text: string; before?: Blob; after?: Blob; removeBefore?: boolean }): Promise<Initiative> {
  const form = new FormData()
  form.append('text', data.text)
  if (data.before) form.append('before', data.before, 'pre.webp')
  if (data.after) form.append('after', data.after, 'posle.webp')
  if (data.removeBefore) form.append('removeBefore', '1')
  return (await request<Wrapped<Initiative>>('POST', `/initiatives/${id}/result`, form)).data
}

export function removeResult(id: string): Promise<unknown> {
  return request('DELETE', `/initiatives/${id}/result`)
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

/* ---------------- Prijava na akciju ---------------- */

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

export interface RegisterResult {
  /** postoji samo kada je nalog napravljen (i korisnik prijavljen) */
  user?: User
  verificationEmailSent?: boolean
  /** mejl je već korišćen za brzu prijavu na akciju: poslat je link za postavljanje lozinke */
  status?: 'activation-sent'
  mailSent?: boolean
}

export async function register(data: RegisterData): Promise<RegisterResult> {
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

/* ---------------- Izmena akcije, prijavljeni, moderacija ---------------- */

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

/** Admin: trajno briše akciju (sa prijavama volontera). */
export function adminDeleteInitiative(id: string): Promise<unknown> {
  return request('DELETE', `/admin/initiatives/${id}`)
}

export function adminUnhideInitiative(id: string): Promise<unknown> {
  return request('POST', `/admin/initiatives/${id}/unhide`)
}

/* ---------------- Admin: statistika i korisnici ---------------- */

export interface DayPoint {
  date: string
  count: number
}

export interface BreakdownRow {
  slug: string
  name: string
  count: number
}

export interface AdminStats {
  generatedAt: string
  users: { total: number; verified: number; unverified: number; quick: number; admins: number; new7: number; new30: number }
  initiatives: {
    total: number
    new7: number
    new30: number
    byStatus: Record<'upcoming' | 'ongoing' | 'finished' | 'permanent' | 'cancelled' | 'hidden', number>
    byCategory: BreakdownRow[]
    byCity: BreakdownRow[]
  }
  participations: { confirmed: number; pending: number; cancelled: number; volunteers: number; new7: number }
  reports: { open: number; resolved: number }
  series: { users: DayPoint[]; initiatives: DayPoint[]; participations: DayPoint[] }
}

export function adminStats(): Promise<AdminStats> {
  return request<AdminStats>('GET', '/admin/stats')
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  emailVerified: boolean
  /** false za naloge nastale brzom prijavom na akciju */
  hasPassword: boolean
  /** nalog je povezan sa Google prijavom */
  hasGoogle: boolean
  createdAt: string | null
  initiatives: number
  participations: number
}

export interface AdminUserPage {
  data: AdminUser[]
  meta: { page: number; lastPage: number; total: number }
}

export function adminUsers(params: { q?: string; role?: 'admin'; page?: number } = {}): Promise<AdminUserPage> {
  const p = new URLSearchParams()
  if (params.q?.trim()) p.set('q', params.q.trim())
  if (params.role) p.set('role', params.role)
  if (params.page && params.page > 1) p.set('page', String(params.page))
  return request<AdminUserPage>('GET', `/admin/users${p.size ? `?${p}` : ''}`)
}

export async function adminSetRole(id: string, role: 'admin' | 'user'): Promise<AdminUser> {
  return (await request<{ user: AdminUser }>('POST', `/admin/users/${id}/role`, { role })).user
}

/** Admin: šalje korisniku mejl sa linkom za postavljanje lozinke (aktivacija naloga nastalog brzom prijavom). */
export function adminSendPasswordLink(id: string): Promise<{ status: 'sent' }> {
  return request('POST', `/admin/users/${id}/password-link`)
}

/** Koji načini prijave su podešeni na serveru (Google dugme se prikazuje tek kada je podešen). */
export interface AuthProviders {
  google: boolean
  /** javni ključ za Cloudflare Turnstile; null kada zaštita nije uključena */
  turnstile: string | null
}

let providers: Promise<AuthProviders> | undefined

export function authProviders(): Promise<AuthProviders> {
  providers ??= request<AuthProviders>('GET', '/auth/providers').catch(() => {
    providers = undefined
    return { google: false, turnstile: null }
  })
  return providers
}

/** Adresa na koju vodi dugme "Nastavi sa Google nalogom". Ovo je običan link (cela strana), ne fetch. */
export function googleLoginUrl(from: string): string {
  return `${BASE}/auth/google/redirect?from=${encodeURIComponent(from)}`
}

/* ---------------- Admin: posete ---------------- */

export interface TrafficTotals {
  views: number
  visitors: number
}

export interface AdminTraffic {
  range: number
  generatedAt: string
  totals: { today: TrafficTotals; last7: TrafficTotals; last30: TrafficTotals; allTime: { views: number; since: string | null } }
  daily: { date: string; views: number; visitors: number }[]
  monthly: { month: string; views: number; visitors: number }[]
  pages: { path: string; title: string | null; views: number; visitors: number }[]
  sources: { name: string; views: number }[]
  devices: { mobile: number; desktop: number }
}

export function adminTraffic(range: 7 | 30 | 90 | 365 = 30): Promise<AdminTraffic> {
  return request('GET', `/admin/traffic?range=${range}`)
}

/** Javno brojanje posete (bez kolačića). Greška se ignoriše: brojanje nikad ne sme da smeta posetiocu. */
export function trackView(path: string, referrer: string, source: string): void {
  fetch(`${BASE}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ path, referrer: referrer || undefined, source: source || undefined }),
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {})
}
