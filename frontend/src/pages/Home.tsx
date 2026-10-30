import CityOptions from '../components/CityOptions'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarPlus, HandHeart, MapPin, Search } from 'lucide-react'
import { listInitiatives } from '../api'
import { Art, AvatarStack, CATEGORY_ICON, CATEGORY_STYLE, DateChip, Spinner } from '../components/Bits'
import InitiativeCard from '../components/InitiativeCard'
import MapView from '../components/MapView'
import { CATEGORIES, cityName } from '../data/constants'
import { getStatus } from '../lib/dates'
import { useAsync } from '../lib/useAsync'
import type { Initiative } from '../types'

const STEPS = [
  { icon: Search, title: 'Pronađi', text: 'Pregledaj inicijative u svom gradu: čišćenje, sadnja, uređenje, pomoć komšijama.' },
  { icon: HandHeart, title: 'Priključi se', text: 'Jednim klikom se prijavi. Organizator zna koliko ljudi dolazi i kada.' },
  { icon: CalendarPlus, title: 'Pokreni svoju', text: 'Imaš ideju? Odredi mesto i datum ili je postavi kao trajnu, pa pozovi komšije.' },
]

export default function Home() {
  const navigate = useNavigate()
  const { data, loading } = useAsync(() => listInitiatives(), [])
  const all = data ?? []
  const upcoming = all.filter((i) => ['upcoming', 'ongoing'].includes(getStatus(i)))
  const featured = upcoming.slice(0, 3)
  const volunteers = all.reduce((s, i) => s + i.participants, 0)

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 size-[30rem] rounded-full bg-sun/40" />
          <div className="absolute -left-20 top-[26rem] size-72 rounded-full bg-[#cdebd3]/70" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-10 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-16">
          <div className="rise">
            <span className="eyebrow">Uključi se u svom kraju</span>
            <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.6rem]">
              Tvoj grad. <br className="hidden sm:block" />
              Uredimo ga <em>zajedno.</em>
            </h1>
            <p className="mt-7 max-w-md text-[17px] leading-relaxed text-ink/70">
              Pokreni akciju u svom kraju ili se priključi komšijama. Okupi ljude koji žele da urade nešto
              korisno za svoj grad.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/inicijative" className="btn-primary">
                Pogledaj inicijative <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link to="/nova-inicijativa" className="btn-secondary">
                Pokreni inicijativu
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <AvatarStack count={Math.max(volunteers, 5)} size="md" />
              <p className="text-[13px] leading-snug text-ink/70">
                <strong className="text-sage-deep">{volunteers} volontera</strong> se već priključilo
                <br />u {new Set(all.map((i) => i.cityId)).size || 'više'} gradova
              </p>
            </div>
          </div>

          {/* kolaž plakata */}
          <div className="relative mx-auto hidden h-[30rem] w-full max-w-md md:block" aria-hidden>
            {featured[0] && <Poster item={featured[0]} className="left-0 top-0 w-[72%] -rotate-3" />}
            {featured[1] && <Poster item={featured[1]} className="bottom-0 right-0 w-[72%] rotate-3" delay />}
            <span className="absolute right-2 top-16 grid size-24 rotate-12 place-items-center rounded-full bg-coral p-3 text-center font-display text-lg font-bold leading-[1.05] text-white shadow-lift">
              Uključi se danas!
            </span>
          </div>
        </div>

        {/* traka za pretragu */}
        <form
          className="relative mx-auto -mb-10 max-w-5xl px-5"
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
          <div className="grid gap-3 rounded-[2rem] border border-sand bg-white p-3 shadow-lift sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:rounded-full sm:p-2.5 sm:pl-6">
            <label className="flex items-center gap-3 sm:border-r sm:border-sand sm:pr-4">
              <MapPin className="size-5 shrink-0 text-coral" aria-hidden />
              <span className="sr-only">Grad</span>
              <select name="grad" className="min-h-12 w-full bg-transparent text-[15px] font-medium text-sage-deep outline-none">
                <option value="">Svi gradovi</option>
                <CityOptions />
              </select>
            </label>
            <label className="flex items-center gap-3 sm:pr-2">
              <Search className="size-5 shrink-0 text-coral" aria-hidden />
              <span className="sr-only">Vrsta inicijative</span>
              <select name="kategorija" className="min-h-12 w-full bg-transparent text-[15px] font-medium text-sage-deep outline-none">
                <option value="">Sve vrste</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn-primary sm:min-h-14 sm:px-9">Pronađi</button>
          </div>
        </form>
      </section>

      {/* KATEGORIJE */}
      <section className="mx-auto mt-32 max-w-6xl px-5">
        <h2 className="mb-8 text-3xl sm:text-4xl">Šta želiš da radiš?</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CATEGORIES.map((c) => {
            const s = CATEGORY_STYLE[c.id]
            const Icon = CATEGORY_ICON[c.id]
            const n = all.filter((i) => i.category === c.id).length
            return (
              <Link
                key={c.id}
                to={`/inicijative?kategorija=${c.id}`}
                className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-3xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
                style={{ background: s.bg, color: s.fg }}
              >
                <Icon
                  className="absolute -bottom-4 -right-4 size-24 opacity-[0.16] transition duration-500 group-hover:scale-110 group-hover:-rotate-6"
                  strokeWidth={1.2}
                  aria-hidden
                />
                <Icon className="relative size-7" strokeWidth={1.8} aria-hidden />
                <div className="relative">
                  <p className="font-display text-lg font-extrabold leading-tight text-sage-deep">{c.label}</p>
                  <p className="mt-1 text-xs font-semibold">{n} inicijativa</p>
                </div>
              </Link>
            )
          })}
          <Link
            to="/nova-inicijativa"
            className="flex min-h-36 flex-col justify-between rounded-3xl bg-sage-deep p-5 text-white transition duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <ArrowRight className="size-7 -rotate-45" aria-hidden />
            <p className="font-display text-lg font-extrabold leading-tight">Pokreni svoju</p>
          </Link>
        </div>
      </section>

      {/* USKORO */}
      <section className="mx-auto mt-28 max-w-6xl px-5">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl sm:text-4xl">Uskoro u tvom gradu</h2>
          <Link to="/inicijative" className="text-[14px] font-semibold text-sage-dark hover:underline">
            Sve inicijative →
          </Link>
        </div>
        {loading ? (
          <Spinner />
        ) : featured.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-sand bg-white px-6 py-14 text-center">
            <p className="font-display text-2xl font-extrabold text-sage-deep">Još nema predstojećih inicijativa</p>
            <p className="mx-auto mt-2 max-w-md text-ink/65">Budi prvi koji će okupiti komšije i pokrenuti nešto korisno u svom kraju.</p>
            <Link to="/nova-inicijativa" className="btn-primary mt-6">
              Pokreni inicijativu
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((i) => (
              <InitiativeCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </section>

      {/* MAPA */}
      <section className="mx-auto mt-28 max-w-6xl px-5">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <span className="eyebrow">Mapa</span>
            <h2 className="text-3xl sm:text-4xl">Pogledaj šta se dešava oko tebe</h2>
            <p className="mt-4 max-w-md text-ink/70">
              Svaka tačka je jedna akcija. Klikni na nju da vidiš detalje i prijaviš se.
            </p>
            <Link to="/inicijative?prikaz=mapa" className="btn-primary mt-7">
              Otvori mapu <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-sand shadow-soft">
            <MapView items={all} height="360px" />
          </div>
        </div>
      </section>

      {/* KAKO */}
      <section className="mx-auto mt-28 max-w-6xl px-5">
        <h2 className="mb-10 max-w-xl text-3xl sm:text-4xl">Tri koraka do boljeg komšiluka</h2>
        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          <span aria-hidden className="absolute left-6 top-6 hidden h-0 w-[calc(100%-3rem)] border-t-2 border-dashed border-sage-dark/30 md:block" />
          <span aria-hidden className="absolute bottom-6 left-6 top-6 w-0 border-l-2 border-dashed border-sage-dark/30 md:hidden" />
          {STEPS.map(({ icon: Icon, title, text }, idx) => (
            <li key={title} className="relative pl-20 md:pl-0 md:pt-20">
              <span className="absolute left-0 top-0 grid size-12 place-items-center rounded-full bg-sage-dark text-white shadow-[0_0_0_6px_var(--color-cream)]">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sage-dark">Korak {idx + 1}</p>
              <h3 className="mt-1 text-2xl">{title}</h3>
              <p className="mt-2 max-w-xs text-[14px] text-ink/70">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-28 max-w-6xl px-5">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-sage-dark px-8 py-16 text-center sm:px-16">
          <div aria-hidden className="absolute -left-16 -top-16 size-64 rounded-full bg-sun/90" />
          <div aria-hidden className="absolute -bottom-20 -right-12 size-72 rounded-full bg-coral" />
          <div aria-hidden className="absolute bottom-10 left-[18%] size-6 rounded-full bg-white/60" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-4xl text-white sm:text-5xl">Imaš ideju za svoj kraj?</h2>
            <p className="mx-auto mt-5 max-w-lg text-white/85">
              Opiši inicijativu, odredi mesto i vreme, a mi ćemo se pobrinuti da je vide ljudi iz tvog grada.
            </p>
            <Link
              to="/nova-inicijativa"
              className="mt-9 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-9 text-[14px] font-semibold text-sage-deep transition duration-200 hover:-translate-y-0.5"
            >
              Pokreni inicijativu <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function Poster({
  item,
  className,
  delay,
}: {
  item: Initiative
  className: string
  delay?: boolean
}) {
  return (
    <div
      className={`rise absolute overflow-hidden rounded-[1.75rem] border border-sand bg-white shadow-lift ${className}`}
      style={delay ? { animationDelay: '150ms' } : undefined}
    >
      <Art category={item.category} image={item.image} className="aspect-[4/3]">
        <div className="absolute left-3 top-3">
          <DateChip item={item} />
        </div>
      </Art>
      <div className="p-4">
        <p className="font-display text-base font-extrabold leading-tight text-sage-deep">{item.title}</p>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-ink/60">
          <MapPin className="size-3.5" aria-hidden /> {cityName(item.cityId)}
        </p>
      </div>
    </div>
  )
}
