import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, Map as MapIcon } from 'lucide-react'
import { errorText, listInitiatives } from '../api'
import { CATEGORY_ICON, CATEGORY_STYLE, Empty, PageHead, Spinner } from '../components/Bits'
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

  // pretraga ide na server tek kad korisnik načas prestane da kuca
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data, loading, error } = useAsync(
    () =>
      listInitiatives({
        cityId: cityId || undefined,
        category: category || undefined,
        status: status || undefined,
        query: debouncedQuery,
      }),
    [cityId, category, status, debouncedQuery],
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
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-10">
      <PageHead
        eyebrow="Pretraga"
        title={
          <>
            Šta možemo da uradimo <em>zajedno?</em>
          </>
        }
        text="Pronađi inicijativu u svom gradu i priključi se komšijama."
      />

      <form
        role="search"
        className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
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

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Vrsta inicijative">
        <button
          onClick={() => set('kategorija', '')}
          aria-pressed={!category}
          className={`min-h-10 rounded-full border-2 px-5 text-[13px] font-semibold transition ${
            !category ? 'border-sage-deep bg-sage-deep text-white' : 'border-sand bg-white text-sage-deep hover:border-sage-deep/30'
          }`}
        >
          Sve
        </button>
        {CATEGORIES.map((c) => {
          const s = CATEGORY_STYLE[c.id]
          const Icon = CATEGORY_ICON[c.id]
          const on = category === c.id
          return (
            <button
              key={c.id}
              onClick={() => set('kategorija', on ? '' : c.id)}
              aria-pressed={on}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border-2 px-4 text-[13px] font-semibold transition hover:-translate-y-0.5"
              style={{
                background: on ? s.fg : s.bg,
                color: on ? '#fff' : s.fg,
                borderColor: on ? s.fg : 'transparent',
              }}
            >
              <Icon className="size-4" aria-hidden />
              {c.label}
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p aria-live="polite" className="text-[13px] text-ink/60">
          {loading ? 'Učitavanje…' : `Pronađeno: ${items.length}`}
        </p>
        <div className="flex rounded-full bg-sand/80 p-1" role="group" aria-label="Prikaz">
          {(['lista', 'mapa'] as const).map((v) => (
            <button
              key={v}
              onClick={() => set('prikaz', v === 'lista' ? '' : v)}
              aria-pressed={view === v}
              className={`flex min-h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold tracking-[0.04em] transition ${
                view === v ? 'bg-sage-dark text-cream shadow-sm' : 'text-sage-deep hover:bg-white/60'
              }`}
            >
              {v === 'lista' ? <List className="size-4" aria-hidden /> : <MapIcon className="size-4" aria-hidden />}
              {v === 'lista' ? 'Lista' : 'Mapa'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <Spinner />
        ) : error ? (
          <Empty title="Učitavanje nije uspelo" text={errorText(error)} />
        ) : items.length === 0 ? (
          <Empty title="Nema inicijativa za ove filtere" text="Probaj drugi grad ili pokreni sopstvenu inicijativu." />
        ) : view === 'mapa' ? (
          <MapView items={items} height="520px" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <InitiativeCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
