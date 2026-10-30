import CitySelect from './CitySelect'
import { useEffect, useState, type FormEvent } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ImagePlus, X } from 'lucide-react'
import { errorText } from '../api'
import { CATEGORIES, CITIES } from '../data/constants'
import { resizeImage } from '../lib/image'
import { toLocalInput } from '../lib/dates'
import type { CategoryId, Initiative, NewInitiative } from '../types'

const pin = L.divIcon({
  className: '',
  html: '<div class="pin" style="width:26px;height:26px"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
})

function Picker({ pos, onPick }: { pos: [number, number] | null; onPick: (p: [number, number]) => void }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.setView(pos, Math.max(map.getZoom(), 13))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.[0], pos?.[1]])
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) })
  return pos ? <Marker position={pos} icon={pin} /> : null
}

/**
 * Slika: undefined = bez izmene, null = ukloni postojeću, Blob = nova slika.
 */
export type ImageChange = Blob | null | undefined

interface Props {
  initial?: Initiative
  defaultCityId?: string
  submitLabel: string
  savingLabel: string
  onSubmit: (data: NewInitiative, image: ImageChange) => Promise<void>
}

export default function InitiativeForm({ initial, defaultCityId, submitLabel, savingLabel, onSubmit }: Props) {
  const editing = !!initial
  const [cityId, setCityId] = useState(initial?.cityId ?? defaultCityId ?? '')
  const city = CITIES.find((c) => c.id === cityId)
  const [pos, setPos] = useState<[number, number] | null>(
    initial ? [initial.lat, initial.lng] : city ? [city.lat, city.lng] : null,
  )
  const [kind, setKind] = useState<'timed' | 'permanent'>(initial?.kind ?? 'timed')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [image, setImage] = useState<Blob>()
  const [preview, setPreview] = useState<string>()
  const [removeExisting, setRemoveExisting] = useState(false)

  function setPicture(blob?: Blob) {
    if (preview) URL.revokeObjectURL(preview)
    setImage(blob)
    setPreview(blob ? URL.createObjectURL(blob) : undefined)
  }

  async function onFile(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Izaberi sliku (JPG, PNG ili WebP).')
    if (file.size > 15 * 1024 * 1024) return setError('Slika je prevelika (najviše 15 MB).')
    setError('')
    try {
      setPicture(await resizeImage(file))
      setRemoveExisting(false)
    } catch {
      setError('Slika se ne može učitati. Probaj drugu.')
    }
  }

  const now = new Date()
  const defStart = new Date(now.getTime() + 7 * 86400_000)
  defStart.setHours(10, 0, 0, 0)
  const defEnd = new Date(defStart.getTime() + 3 * 3600_000)
  const startValue = initial?.startDate ? toLocalInput(new Date(initial.startDate)) : toLocalInput(defStart)
  const endValue = initial?.endDate ? toLocalInput(new Date(initial.endDate)) : toLocalInput(defEnd)

  // slika koja se trenutno prikazuje: nova, ili postojeća ako nije uklonjena
  const shownImage = preview ?? (!removeExisting ? initial?.image : undefined)

  async function submit(e: FormEvent<HTMLFormElement>) {
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
    if (!cityId) return setError('Izaberi grad iz liste.')
    if (!pos) return setError('Označi mesto na mapi.')

    setSaving(true)
    try {
      await onSubmit(
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
        image ?? (removeExisting ? null : undefined),
      )
    } catch (err) {
      setError(errorText(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-7 p-6 sm:p-10">
      <div>
        <label className="label" htmlFor="title">
          Naslov
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={160}
          defaultValue={initial?.title}
          className="field"
          placeholder="Npr. Čišćenje parka kod škole"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Vrsta
          </label>
          <select id="category" name="category" required className="field" defaultValue={initial?.category ?? ''}>
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
            Grad ili opština
          </label>
          <CitySelect
            id="city"
            value={cityId}
            onChange={(id) => {
              setCityId(id)
              const c = CITIES.find((x) => x.id === id)
              setPos(c ? [c.lat, c.lng] : null)
            }}
          />
        </div>
      </div>

      <div>
        <span className="label">
          Slika <span className="font-normal normal-case tracking-normal text-ink/60">(opciono, ljudi će lakše shvatiti šta rešavate)</span>
        </span>
        {shownImage ? (
          <div className="relative overflow-hidden rounded-3xl">
            <img src={shownImage} alt="Izabrana slika" className="h-56 w-full object-cover" />
            <div className="absolute right-3 top-3 flex gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-sage-deep shadow-md">
                <ImagePlus className="size-4" aria-hidden /> Zameni
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <button
                type="button"
                onClick={() => {
                  setPicture(undefined)
                  setRemoveExisting(true)
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-sage-deep shadow-md"
              >
                <X className="size-4" aria-hidden /> Ukloni
              </button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sand bg-mist/60 px-6 py-10 text-center transition hover:border-sage-dark/50 hover:bg-white">
            <ImagePlus className="size-8 text-sage-dark" aria-hidden />
            <span className="text-[14px] font-semibold text-sage-deep">Dodaj sliku</span>
            <span className="text-xs text-ink/55">JPG, PNG ili WebP. Bez slike prikazuje se ilustracija vrste inicijative.</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        )}
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
          minLength={10}
          maxLength={5000}
          defaultValue={initial?.description}
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
              className={`flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-2xl border px-3 text-center text-[13px] font-semibold transition ${
                kind === k
                  ? 'border-sage-dark bg-sage/20 text-sage-deep ring-4 ring-sage/15'
                  : 'border-sand bg-white/80 text-ink/65 hover:border-sage/60'
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
              <input
                id="start"
                name="start"
                type="datetime-local"
                required
                defaultValue={startValue}
                min={editing ? undefined : toLocalInput(now)}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="end">
                Kraj
              </label>
              <input id="end" name="end" type="datetime-local" required defaultValue={endValue} className="field" />
            </div>
          </div>
        )}
        {editing && (
          <p className="mt-3 text-xs text-ink/55">Ako promeniš vreme ili mesto, svi prijavljeni dobijaju obaveštenje mejlom.</p>
        )}
      </fieldset>

      <div>
        <label className="label" htmlFor="address">
          Adresa / opis mesta
        </label>
        <input
          id="address"
          name="address"
          required
          maxLength={255}
          defaultValue={initial?.address}
          className="field"
          placeholder="Ulica i broj ili poznata lokacija"
        />
        <p className="mb-2 mt-4 text-sm text-ink/70">Klikni na mapu da označiš tačnu lokaciju.</p>
        <MapContainer center={pos ?? [44.2, 20.8]} zoom={pos ? 13 : 7} style={{ height: 280 }} className="w-full border border-sand">
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
          <input id="capacity" name="capacity" type="number" min={1} max={1000} defaultValue={initial?.capacity} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="contact">
            Kontakt <span className="font-normal text-ink/60">(opciono)</span>
          </label>
          <input id="contact" name="contact" maxLength={160} defaultValue={initial?.contact} className="field" placeholder="Mejl ili telefon" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="bring">
          Šta volonteri treba da ponesu <span className="font-normal text-ink/60">(opciono)</span>
        </label>
        <input id="bring" name="bring" maxLength={255} defaultValue={initial?.bring} className="field" placeholder="Rukavice, voda, udobna obuća…" />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">
          {error}
        </p>
      )}

      <button disabled={saving} className="btn-primary w-full sm:w-auto">
        {saving ? savingLabel : submitLabel}
      </button>
    </form>
  )
}
