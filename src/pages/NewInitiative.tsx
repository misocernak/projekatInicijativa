import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { createInitiative } from '../api'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, CITIES } from '../data/constants'
import { toLocalInput } from '../lib/dates'
import type { CategoryId } from '../types'

const pin = L.divIcon({
  className: '',
  html: '<div class="pin" style="width:26px;height:26px"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
})

function Picker({ pos, onPick }: { pos: [number, number]; onPick: (p: [number, number]) => void }) {
  const map = useMap()
  useEffect(() => {
    map.setView(pos, Math.max(map.getZoom(), 13))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos[0], pos[1]])
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) })
  return <Marker position={pos} icon={pin} />
}

export default function NewInitiative() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cityId, setCityId] = useState(user?.cityId ?? CITIES[0].id)
  const city = CITIES.find((c) => c.id === cityId)!
  const [pos, setPos] = useState<[number, number]>([city.lat, city.lng])
  const [kind, setKind] = useState<'timed' | 'permanent'>('timed')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl text-sage-deep">Prijavi se da bi pokrenuo inicijativu</h1>
        <p className="mt-3 text-ink/75">
          Nalog nam služi da organizator i volonteri znaju ko je ko, i da sprečimo zloupotrebe.
        </p>
        <Link to="/prijava" state={{ from: '/nova-inicijativa' }} className="btn-primary mt-6">
          Prijava ili registracija
        </Link>
      </div>
    )
  }

  const now = new Date()
  const defStart = new Date(now.getTime() + 7 * 86400_000)
  defStart.setHours(10, 0, 0, 0)
  const defEnd = new Date(defStart.getTime() + 3 * 3600_000)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const s = (k: string) => String(f.get(k) ?? '').trim()
    setError('')

    let startDate: string | undefined
    let endDate: string | undefined
    if (kind === 'timed') {
      const start = new Date(s('start'))
      const end = new Date(s('end'))
      if (isNaN(+start) || isNaN(+end)) return setError('Unesi početak i kraj inicijative.')
      if (end <= start) return setError('Kraj mora biti posle početka.')
      startDate = start.toISOString()
      endDate = end.toISOString()
    }
    const cap = Number(s('capacity'))

    setSaving(true)
    const item = await createInitiative(
      {
        title: s('title'),
        description: s('description'),
        category: s('category') as CategoryId,
        cityId,
        address: s('address'),
        lat: pos[0],
        lng: pos[1],
        kind,
        startDate,
        endDate,
        capacity: cap > 0 ? cap : undefined,
        bring: s('bring') || undefined,
        contact: s('contact') || undefined,
      },
      user!,
    )
    navigate(`/inicijative/${item.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl text-sage-deep">Pokreni inicijativu</h1>
      <p className="mt-2 text-ink/75">Opiši šta želiš da uradiš. Ostali iz tvog grada će moći da se prijave.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div>
          <label className="label" htmlFor="title">
            Naslov
          </label>
          <input id="title" name="title" required maxLength={120} className="field" placeholder="Npr. Čišćenje parka kod škole" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">
              Vrsta
            </label>
            <select id="category" name="category" required className="field" defaultValue="">
              <option value="" disabled>
                Izaberi vrstu
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="city">
              Grad
            </label>
            <select
              id="city"
              className="field"
              value={cityId}
              onChange={(e) => {
                setCityId(e.target.value)
                const c = CITIES.find((x) => x.id === e.target.value)!
                setPos([c.lat, c.lng])
              }}
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">
            Opis
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={6}
            className="field py-3"
            placeholder="Šta radimo, zašto je važno, kako izgleda dan akcije…"
          />
        </div>

        <fieldset>
          <legend className="label">Trajanje</legend>
          <div className="flex gap-3">
            {(['timed', 'permanent'] as const).map((k) => (
              <label
                key={k}
                className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-bold ${
                  kind === k ? 'border-sage-dark bg-sage/25 text-sage-deep' : 'border-sand bg-white text-ink/70'
                }`}
              >
                <input type="radio" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                {k === 'timed' ? 'Ima datum početka i kraja' : 'Trajna inicijativa'}
              </label>
            ))}
          </div>
          {kind === 'timed' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="start">
                  Početak
                </label>
                <input id="start" name="start" type="datetime-local" required defaultValue={toLocalInput(defStart)} min={toLocalInput(now)} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="end">
                  Kraj
                </label>
                <input id="end" name="end" type="datetime-local" required defaultValue={toLocalInput(defEnd)} className="field" />
              </div>
            </div>
          )}
        </fieldset>

        <div>
          <label className="label" htmlFor="address">
            Adresa / opis mesta
          </label>
          <input id="address" name="address" required className="field" placeholder="Ulica i broj ili poznata lokacija" />
          <p className="mb-2 mt-4 text-sm text-ink/70">Klikni na mapu da označiš tačnu lokaciju.</p>
          <MapContainer center={pos} zoom={13} style={{ height: 280 }} className="w-full border border-sand">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Picker pos={pos} onPick={setPos} />
          </MapContainer>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="capacity">
              Broj potrebnih volontera <span className="font-normal text-ink/60">(opciono)</span>
            </label>
            <input id="capacity" name="capacity" type="number" min={1} max={1000} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="contact">
              Kontakt <span className="font-normal text-ink/60">(opciono)</span>
            </label>
            <input id="contact" name="contact" className="field" placeholder="Mejl ili telefon" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="bring">
            Šta volonteri treba da ponesu <span className="font-normal text-ink/60">(opciono)</span>
          </label>
          <input id="bring" name="bring" className="field" placeholder="Rukavice, voda, udobna obuća…" />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">
            {error}
          </p>
        )}

        <button disabled={saving} className="btn-primary w-full sm:w-auto">
          {saving ? 'Objavljivanje…' : 'Objavi inicijativu'}
        </button>
      </form>
    </div>
  )
}
