import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { listResults } from '../api'
import { Empty, PageHead, Spinner } from '../components/Bits'
import CitySelect from '../components/CitySelect'
import ResultCard from '../components/ResultCard'
import ResultStats from '../components/ResultStats'
import { CATEGORIES } from '../data/constants'
import { useAsync } from '../lib/useAsync'

/** "Uradili smo": završene akcije sa slikama pre i posle i brojkama. */
export default function Results() {
  const [params, setParams] = useSearchParams()
  const city = params.get('grad') ?? ''
  const category = params.get('kategorija') ?? ''

  const { data, loading, error } = useAsync(() => listResults({ city, category, perPage: 48 }), [city, category])

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

  const items = (data?.data ?? []).filter((i) => i.result?.after)
  const filtered = !!city || !!category

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-10">
      <PageHead
        eyebrow="Uradili smo"
        title={
          <>
            Evo šta je ispalo kad se <em>okupimo.</em>
          </>
        }
        text="Akcije koje su pokrenute, organizovane i završene preko Lepše Srbije: od ideje do rezultata, sa slikama pre i posle."
      />

      {data && !filtered && data.stats.actions > 0 && (
        <div className="mb-10">
          <ResultStats stats={data.stats} />
        </div>
      )}

      <div className="card grid gap-4 p-5 sm:grid-cols-[1fr_2fr]">
        <div>
          <label className="label" htmlFor="r-grad">
            Grad
          </label>
          <CitySelect id="r-grad" value={city} onChange={(id) => set('grad', id)} allLabel="Svi gradovi" />
        </div>
        <div>
          <span className="label">Vrsta</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Vrsta akcije">
            {[{ id: '', label: 'Sve' }, ...CATEGORIES].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => set('kategorija', c.id)}
                aria-pressed={category === c.id}
                className={`min-h-10 rounded-full border px-4 text-[13px] font-semibold transition ${
                  category === c.id
                    ? 'border-sage-dark bg-sage-dark text-white'
                    : 'border-sand bg-white text-ink/70 hover:border-sage-dark/40'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <Empty title="Rezultati se ne mogu učitati" text="Proveri vezu i osveži stranicu." />
        ) : items.length === 0 ? (
          <Empty
            title={filtered ? 'Nema rezultata za ove filtere' : 'Prvi rezultati stižu uskoro'}
            text={
              filtered
                ? 'Probaj drugi grad ili vrstu akcije.'
                : 'Kad se prva akcija završi, organizator ovde objavljuje šta je urađeno.'
            }
          />
        ) : (
          <ul className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <li key={i.id}>
                <ResultCard item={i} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-16 rounded-[2rem] bg-sage-dark px-8 py-10 text-center sm:px-14">
        <h2 className="text-3xl text-white sm:text-4xl">Sledeća priča može biti tvoja</h2>
        <p className="mx-auto mt-3 max-w-lg text-white/85">Pokreni akciju u svom kraju, okupi komšije i pokaži šta ste uradili.</p>
        <Link
          to="/nova-inicijativa"
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-[14px] font-semibold text-sage-deep transition hover:-translate-y-0.5"
        >
          Pokreni akciju <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
