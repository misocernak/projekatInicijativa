import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarPlus, HandHeart, Search } from 'lucide-react'
import { listInitiatives } from '../api'
import { Spinner } from '../components/Bits'
import InitiativeCard from '../components/InitiativeCard'
import { CATEGORIES, CITIES } from '../data/constants'
import { getStatus } from '../lib/dates'
import { useAsync } from '../lib/useAsync'

const STEPS = [
  {
    icon: Search,
    title: 'Pronađi',
    text: 'Pregledaj inicijative u svom gradu: čišćenje, sadnja, uređenje, pomoć komšijama.',
  },
  {
    icon: HandHeart,
    title: 'Priključi se',
    text: 'Jednim klikom se prijavi. Organizator zna koliko ljudi dolazi i kada.',
  },
  {
    icon: CalendarPlus,
    title: 'Pokreni svoju',
    text: 'Imaš ideju? Odredi mesto i datum ili je postavi kao trajnu, pa pozovi komšije.',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { data, loading } = useAsync(() => listInitiatives(), [])
  const featured = (data ?? []).filter((i) => ['upcoming', 'ongoing'].includes(getStatus(i))).slice(0, 3)

  return (
    <>
      <section className="bg-sage/20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.3fr_1fr] md:py-20">
          <div>
            <h1 className="text-4xl leading-tight text-sage-deep sm:text-5xl">
              Tvoj grad je tvoj. Hajde da ga uredimo zajedno.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink/80">
              Objavi inicijativu ili se priključi nekoj u svom gradu. Bez novca i birokratije, samo
              ljudi koji žele da urade nešto korisno.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/inicijative" className="btn-primary">
                Pogledaj inicijative <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link to="/nova-inicijativa" className="btn-secondary">
                Pokreni inicijativu
              </Link>
            </div>
          </div>

          <form
            className="self-end rounded-2xl bg-cream p-5 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const p = new URLSearchParams()
              for (const k of ['grad', 'kategorija']) {
                const v = String(f.get(k) ?? '')
                if (v) p.set(k, v)
              }
              navigate(`/inicijative?${p}`)
            }}
          >
            <h2 className="mb-4 text-xl text-sage-deep">Šta se dešava u tvom gradu?</h2>
            <label className="label" htmlFor="h-grad">
              Grad
            </label>
            <select id="h-grad" name="grad" className="field mb-3">
              <option value="">Svi gradovi</option>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="label" htmlFor="h-kat">
              Vrsta inicijative
            </label>
            <select id="h-kat" name="kategorija" className="field mb-4">
              <option value="">Sve vrste</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <button className="btn-primary w-full">Prikaži</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-3xl text-sage-deep">Uskoro u tvom gradu</h2>
          <Link to="/inicijative" className="text-sm font-bold text-sage-dark hover:underline">
            Sve inicijative →
          </Link>
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((i) => (
              <InitiativeCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="mb-8 text-3xl text-sage-deep">Kako funkcioniše</h2>
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, idx) => (
            <li key={title} className="rounded-2xl bg-sand/60 p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-sage-dark text-cream">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-display text-xl text-sage-deep">
                  {idx + 1}. {title}
                </span>
              </div>
              <p className="text-ink/80">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
