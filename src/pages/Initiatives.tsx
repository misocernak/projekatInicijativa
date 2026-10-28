import { useSearchParams } from 'react-router-dom'
import { List, Map as MapIcon } from 'lucide-react'
import { listInitiatives } from '../api'
import { Empty, Spinner } from '../components/Bits'
import InitiativeCard from '../components/InitiativeCard'
import MapView from '../components/MapView'
import { CATEGORIES, CITIES, STATUS_LABEL } from '../data/constants'
import { useAsync } from '../lib/useAsync'
import type { CategoryId, InitiativeStatus } from '../types'

const STATUSES: InitiativeStatus[] = ['upcoming', 'ongoing', 'permanent', 'finished']

export default function Initiatives() {
  const [params, setParams] = useSearchParams()
  const cityId = params.get('grad') ?? ''
  const category = (params.get('kategorija') ?? '') as CategoryId | ''
  const status = (params.get('status') ?? '') as InitiativeStatus | ''
  const query = params.get('q') ?? ''
  const view = params.get('prikaz') === 'mapa' ? 'mapa' : 'lista'

  const { data, loading } = useAsync(
    () =>
      listInitiatives({
        cityId: cityId || undefined,
        category: category || undefined,
        status: status || undefined,
        query,
      }),
    [cityId, category, status, query],
  )

  const set = (key: string, value: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (value) n.set(key, value)
        else n.delete(key)
        return n
      },
      { replace: true },
    )

  const items = data ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl text-sage-deep">Inicijative</h1>
      <p className="mt-2 text-ink/75">Pronađi nešto što možeš da uradiš zajedno sa komšijama.</p>

      <form
        role="search"
        className="mt-6 grid gap-3 rounded-2xl bg-sand/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="label" htmlFor="f-q">
            Pretraga
          </label>
          <input
            id="f-q"
            type="search"
            className="field"
            placeholder="Npr. park, sadnja, igralište…"
            value={query}
            onChange={(e) => set('q', e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="f-grad">
            Grad
          </label>
          <select id="f-grad" className="field" value={cityId} onChange={(e) => set('grad', e.target.value)}>
            <option value="">Svi gradovi</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-kat">
            Vrsta
          </label>
          <select id="f-kat" className="field" value={category} onChange={(e) => set('kategorija', e.target.value)}>
            <option value="">Sve vrste</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="label" htmlFor="f-status">
            Status
          </label>
          <select id="f-status" className="field" value={status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Svi</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between">
        <p aria-live="polite" className="text-sm text-ink/70">
          {loading ? 'Učitavanje…' : `Pronađeno: ${items.length}`}
        </p>
        <div className="flex rounded-full bg-sand p-1" role="group" aria-label="Prikaz">
          {(['lista', 'mapa'] as const).map((v) => (
            <button
              key={v}
              onClick={() => set('prikaz', v === 'lista' ? '' : v)}
              aria-pressed={view === v}
              className={`flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-bold ${
                view === v ? 'bg-sage-dark text-cream' : 'text-sage-deep'
              }`}
            >
              {v === 'lista' ? <List className="size-4" aria-hidden /> : <MapIcon className="size-4" aria-hidden />}
              {v === 'lista' ? 'Lista' : 'Mapa'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty title="Nema inicijativa za ove filtere" text="Probaj drugi grad ili pokreni sopstvenu inicijativu." />
        ) : view === 'mapa' ? (
          <MapView items={items} height="520px" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <InitiativeCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
