import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { listInitiatives, participantCount } from '../api'
import { Spinner } from '../components/Bits'
import InitiativeCard from '../components/InitiativeCard'
import { CATEGORIES, CITIES } from '../data/constants'
import { getStatus } from '../lib/dates'
import { useAsync } from '../lib/useAsync'

const STEPS = [
  {
    title: 'Pronađi',
    text: 'Pregledaj inicijative u svom gradu: čišćenje, sadnja, uređenje, pomoć komšijama.',
  },
  {
    title: 'Priključi se',
    text: 'Jednim klikom se prijavi. Organizator zna koliko ljudi dolazi i kada.',
  },
  {
    title: 'Pokreni svoju',
    text: 'Imaš ideju? Odredi mesto i datum ili je postavi kao trajnu, pa pozovi komšije.',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { data, loading } = useAsync(() => listInitiatives(), [])
  const all = data ?? []
  const featured = all.filter((i) => ['upcoming', 'ongoing'].includes(getStatus(i))).slice(0, 3)
  const stats = [
    { n: all.length, label: 'inicijativa' },
    { n: new Set(all.map((i) => i.cityId)).size, label: 'gradova' },
    { n: all.reduce((s, i) => s + participantCount(i), 0), label: 'volontera' },
  ]

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-32 size-[40rem] rounded-full bg-[radial-gradient(closest-side,rgb(139_154_110/0.32),transparent)]" />
        <div aria-hidden className="pointer-events-none absolute -left-48 top-56 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(234_226_214/0.9),transparent)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 md:grid-cols-[1.35fr_1fr] md:pb-28 md:pt-20">
          <div className="rise">
            <span className="eyebrow">Građanske inicijative</span>
            <h1 className="text-[3.4rem] leading-[0.98] text-sage-deep sm:text-7xl lg:text-[5.5rem]">
              Tvoj grad je tvoj. Uredimo ga <em>zajedno.</em>
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-ink/70">
              Objavi inicijativu ili se priključi nekoj u svom gradu. Bez novca i birokratije, samo
              ljudi koji žele da urade nešto korisno.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/inicijative" className="btn-primary">
                Pogledaj inicijative <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link to="/nova-inicijativa" className="btn-secondary">
                Pokreni inicijativu
              </Link>
            </div>
            <dl className="mt-14 flex gap-10 border-t border-sand pt-6 sm:gap-14">
              {stats.map((s) => (
                <div key={s.label}>
                  <dd className="font-display text-5xl leading-none text-sage-deep">{s.n}</dd>
                  <dt className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <form
            className="rise rounded-[2rem] border border-white/70 bg-white/70 p-7 shadow-lift backdrop-blur-md [animation-delay:120ms]"
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
            <h2 className="mb-6 text-3xl text-sage-deep">Šta se dešava u tvom gradu?</h2>
            <label className="label" htmlFor="h-grad">
              Grad
            </label>
            <select id="h-grad" name="grad" className="field mb-5">
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
            <select id="h-kat" name="kategorija" className="field mb-7">
              <option value="">Sve vrste</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <button className="btn-primary w-full">Prikaži inicijative</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Na redu</span>
            <h2 className="text-5xl text-sage-deep">Uskoro u tvom gradu</h2>
          </div>
          <Link to="/inicijative" className="text-[13px] font-semibold tracking-[0.04em] text-sage-dark hover:underline">
            Sve inicijative →
          </Link>
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((i) => (
              <InitiativeCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-28 max-w-6xl px-5">
        <span className="eyebrow">Kako funkcioniše</span>
        <h2 className="mb-12 max-w-xl text-5xl text-sage-deep">Tri koraka do boljeg komšiluka</h2>
        <ol className="grid gap-10 md:grid-cols-3">
          {STEPS.map(({ title, text }, idx) => (
            <li key={title} className="relative border-t border-sage-dark/25 pt-6">
              <span className="font-display text-7xl leading-none text-sage/60">0{idx + 1}</span>
              <h3 className="mt-3 text-3xl text-sage-deep">{title}</h3>
              <p className="mt-3 text-ink/70">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-28 max-w-6xl px-5">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-sage-deep px-8 py-16 text-center sm:px-16">
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-[26rem] rounded-full bg-[radial-gradient(closest-side,rgb(139_154_110/0.3),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 size-[26rem] rounded-full bg-[radial-gradient(closest-side,rgb(91_104_68/0.7),transparent)]" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-5xl text-cream sm:text-6xl">
              Imaš ideju za svoj kraj? <em className="text-sage">Pozovi komšije.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-cream/70">
              Opiši inicijativu, odredi mesto i vreme, a mi ćemo se pobrinuti da je vide ljudi iz tvog grada.
            </p>
            <Link
              to="/nova-inicijativa"
              className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cream px-8 text-[13px] font-semibold tracking-[0.04em] text-sage-deep transition duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              Pokreni inicijativu <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
