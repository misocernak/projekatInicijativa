import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Mail, MapPin, Package, Users } from 'lucide-react'
import { cancelInitiative, getInitiative, isJoined, participantCount, toggleJoin } from '../api'
import { Spinner, StatusBadge } from '../components/Bits'
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
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl text-sage-deep">Inicijativa nije pronađena</h1>
        <Link to="/inicijative" className="btn-primary mt-6">
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/inicijative" className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-sage-dark hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Sve inicijative
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <article>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-sm font-bold text-sage-deep/80">{categoryLabel(item.category)}</span>
          </div>
          <h1 className="text-3xl leading-tight text-sage-deep sm:text-4xl">{item.title}</h1>
          <p className="mt-2 text-sm text-ink/70">Organizator: {item.organizerName}</p>

          <div className="mt-6 space-y-4 text-lg leading-relaxed text-ink/90">
            {item.description.split('\n\n').map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {item.bring && (
            <section className="mt-8 rounded-2xl bg-sand/60 p-5">
              <h2 className="mb-1 flex items-center gap-2 text-xl text-sage-deep">
                <Package className="size-5" aria-hidden /> Šta poneti
              </h2>
              <p className="text-ink/85">{item.bring}</p>
            </section>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-xl text-sage-deep">Lokacija</h2>
            <MapView items={[item]} height="300px" link={false} />
          </section>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-sand bg-white p-5">
            <ul className="space-y-3 text-ink/85">
              <li className="flex gap-3">
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-sage-dark" aria-hidden />
                {formatWhen(item)}
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-sage-dark" aria-hidden />
                {cityName(item.cityId)}, {item.address}
              </li>
              <li className="flex gap-3">
                <Users className="mt-0.5 size-5 shrink-0 text-sage-dark" aria-hidden />
                <span aria-live="polite">
                  {count} prijavljenih{item.capacity ? ` od ${item.capacity} mesta` : ''}
                </span>
              </li>
              {item.contact && (
                <li className="flex gap-3">
                  <Mail className="mt-0.5 size-5 shrink-0 text-sage-dark" aria-hidden />
                  {item.contact}
                </li>
              )}
            </ul>

            {item.capacity ? (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-mist" aria-hidden>
                <div
                  className="h-full bg-sage"
                  style={{ width: `${Math.min(100, (count / item.capacity) * 100)}%` }}
                />
              </div>
            ) : null}

            <button
              onClick={onJoin}
              disabled={busy || closed || full}
              className={`mt-5 w-full ${joined ? 'btn-secondary' : 'btn-primary'}`}
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
              <p className="mt-2 text-center text-xs text-ink/60">Za prijavu je potrebna prijava na nalog.</p>
            )}
            {joined && (
              <p className="mt-3 text-center text-sm font-bold text-sage-dark">Prijavljen/a si. Vidimo se!</p>
            )}
            {isOwner && !closed && (
              <button onClick={onCancel} className="mt-3 w-full text-sm font-bold text-clay hover:underline">
                Otkaži inicijativu
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
