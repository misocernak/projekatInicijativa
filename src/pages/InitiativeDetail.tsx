import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Mail, MapPin, Package } from 'lucide-react'
import { cancelInitiative, getInitiative, isJoined, participantCount, toggleJoin } from '../api'
import { Art, AvatarStack, CATEGORY_STYLE, DateChip, Spinner, StatusBadge } from '../components/Bits'
import MapView from '../components/MapView'
import { useAuth } from '../context/AuthContext'
import { categoryLabel, cityName } from '../data/constants'
import { formatWhen, getStatus } from '../lib/dates'
import { useAsync } from '../lib/useAsync'

export default function InitiativeDetail() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: item, loading } = useAsync(() => getInitiative(id), [id])
  const [joined, setJoined] = useState(() => isJoined(id))
  const [busy, setBusy] = useState(false)
  const [, bump] = useState(0)

  if (loading) return <Spinner />
  if (!item) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-5xl text-sage-deep">Inicijativa nije pronađena</h1>
        <Link to="/inicijative" className="btn-primary mt-8">
          Nazad na inicijative
        </Link>
      </div>
    )
  }

  const status = getStatus(item)
  const count = participantCount(item)
  const full = !!item.capacity && count >= item.capacity && !joined
  const closed = status === 'finished' || status === 'cancelled'
  const isOwner = user?.id === item.organizerId

  async function onJoin() {
    if (!user) return navigate('/prijava', { state: { from: `/inicijative/${id}` } })
    setBusy(true)
    setJoined(await toggleJoin(id))
    setBusy(false)
    bump((n) => n + 1)
  }

  async function onCancel() {
    if (!confirm('Da li sigurno želiš da otkažeš ovu inicijativu?')) return
    await cancelInitiative(id)
    navigate('/profil')
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-8">
      <Link
        to="/inicijative"
        className="mb-8 inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.04em] text-sage-dark hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Sve inicijative
      </Link>

      <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <article className="rise">
          <Art category={item.category} image={item.image} className="h-56 rounded-[2rem] sm:h-80">
            <div className="absolute inset-x-5 top-5 flex items-start justify-between">
              <DateChip item={item} />
              <StatusBadge status={status} />
            </div>
          </Art>
          <div className="mt-8">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: CATEGORY_STYLE[item.category].fg }}>
              {categoryLabel(item.category)}
            </span>
            <h1 className="mt-3 text-4xl leading-[1.08] sm:text-5xl">{item.title}</h1>
            <p className="mt-5 flex items-center gap-3 text-[13px] text-ink/65">
              <span className="grid size-9 place-items-center rounded-full bg-sage-dark text-sm font-bold text-white">
                {item.organizerName.charAt(0)}
              </span>
              Organizator: <strong className="text-sage-deep">{item.organizerName}</strong>
            </p>
          </div>

          <div className="mt-10 space-y-5 text-[17px] leading-[1.85] text-ink/85">
            {item.description.split('\n\n').map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {item.bring && (
            <section className="mt-10 rounded-3xl bg-[#fde7a9]/70 p-7">
              <h2 className="mb-2 flex items-center gap-3 text-2xl text-sage-deep">
                <Package className="size-6 text-sage-dark" aria-hidden /> Šta poneti
              </h2>
              <p className="text-ink/80">{item.bring}</p>
            </section>
          )}

          <section className="mt-10">
            <h2 className="mb-4 text-2xl text-sage-deep">Lokacija</h2>
            <MapView items={[item]} height="320px" link={false} />
          </section>
        </article>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card rise p-7 [animation-delay:120ms]">
            <div className="mb-6 flex items-center justify-between">
              <AvatarStack count={count} size="md" />
              <p className="text-[13px] text-ink/65">
                <strong className="font-display text-3xl font-extrabold text-sage-deep">{count}</strong>
                {item.capacity ? ` / ${item.capacity}` : ''} volontera
              </p>
            </div>
            <ul className="space-y-4 text-[14px] text-ink/80">
              <li className="flex gap-3.5">
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-sage-dark" aria-hidden />
                {formatWhen(item)}
              </li>
              <li className="flex gap-3.5">
                <MapPin className="mt-0.5 size-5 shrink-0 text-sage-dark" aria-hidden />
                {cityName(item.cityId)}, {item.address}
              </li>
              {item.contact && (
                <li className="flex gap-3.5">
                  <Mail className="mt-0.5 size-5 shrink-0 text-sage-dark" aria-hidden />
                  {item.contact}
                </li>
              )}
            </ul>

            {item.capacity ? (
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden>
                <div
                  className="h-full rounded-full bg-sage"
                  style={{ width: `${Math.min(100, (count / item.capacity) * 100)}%` }}
                />
              </div>
            ) : null}

            <button
              onClick={onJoin}
              disabled={busy || closed || full}
              className={`mt-6 w-full ${joined ? 'btn-secondary' : 'btn-primary'}`}
            >
              {closed
                ? status === 'cancelled'
                  ? 'Inicijativa je otkazana'
                  : 'Inicijativa je završena'
                : full
                  ? 'Nema slobodnih mesta'
                  : joined
                    ? 'Odjavi me'
                    : 'Priključi se'}
            </button>
            {!user && !closed && (
              <p className="mt-3 text-center text-xs text-ink/55">Za prijavu je potreban nalog.</p>
            )}
            {joined && (
              <p className="mt-4 text-center font-display text-xl font-extrabold text-sage-dark">Prijavljen/a si. Vidimo se!</p>
            )}
            {isOwner && !closed && (
              <button onClick={onCancel} className="mt-4 w-full text-[13px] font-semibold text-clay hover:underline">
                Otkaži inicijativu
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
