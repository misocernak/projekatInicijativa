import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CheckCircle2, Eye, EyeOff, Flag, Trash2, Info, Mail, MapPin, Package, Pencil, Users } from 'lucide-react'
import {
  adminDeleteInitiative,
  adminHideInitiative,
  adminUnhideInitiative,
  cancelInitiative,
  removeResult,
  errorText,
  getInitiative,
  join,
  leave,
  listParticipants,
  reportInitiative,
  type ParticipantRow,
  type ReportReason,
} from '../api'
import { Art, AvatarStack, CATEGORY_STYLE, DateChip, Empty, Spinner, StatusBadge } from '../components/Bits'
import BeforeAfter from '../components/BeforeAfter'
import MapView from '../components/MapView'
import ResultForm from '../components/ResultForm'
import Turnstile from '../components/Turnstile'
import ShareInitiative from '../components/ShareInitiative'
import { useAuth } from '../context/AuthContext'
import { categoryLabel, cityName } from '../data/constants'
import { formatWhen, getStatus } from '../lib/dates'
import { useAsync } from '../lib/useAsync'
import { usePageMeta } from '../lib/seo'
import type { Initiative } from '../types'

/** Opis za pretragu i deljenje: kada i gde, pa početak opisa; najviše oko 155 znakova. */
function shortDescription(i: Initiative): string {
  const lead = [i.kind === 'permanent' ? 'Trajna akcija' : formatWhen(i), `${cityName(i.cityId)}, ${i.address}`].filter(Boolean).join(' · ')
  const body = (i.result?.text ?? i.description).replace(/\s+/g, ' ').trim()
  const text = `${lead}. ${body}`
  return text.length <= 155 ? text : `${text.slice(0, 154).replace(/\s+\S*$/, '')}…`
}

/** Poruke posle klika na link iz mejla (?prijava=...). */
const BANNERS: Record<string, { text: string; good: boolean }> = {
  potvrdjena: { text: 'Prijava je potvrđena. Detalje i kalendar smo ti poslali mejlom. Vidimo se!', good: true },
  otkazana: { text: 'Odjavljen/a si sa akcije. Hvala što si javio/la.', good: true },
  popunjeno: { text: 'Nažalost, sva mesta su u međuvremenu popunjena, pa prijava nije potvrđena.', good: false },
  zatvorena: { text: 'Ova akcija je završena ili otkazana, pa se prijava ne može potvrditi.', good: false },
}

export default function InitiativeDetail() {
  const { id = '' } = useParams()
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: item, loading, error, setData } = useAsync(() => getInitiative(id), [id, user?.id])
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [sentTo, setSentTo] = useState<{ email: string; mailSent: boolean } | null>(null)
  const [guest, setGuest] = useState({ name: '', email: '', consent: false })
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [resultOpen, setResultOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [report, setReport] = useState<{ reason: ReportReason; message: string; email: string }>({
    reason: 'spam',
    message: '',
    email: '',
  })
  const [reportState, setReportState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [reportError, setReportError] = useState('')

  usePageMeta(
    item && !item.hidden
      ? {
          title: `${item.title} – ${cityName(item.cityId)} | Lepša Srbija`,
          description: shortDescription(item),
          image: item.image ?? item.result?.after,
        }
      : undefined,
  )

  const canManage = !!item && (!!item.viewer?.isOrganizer || user?.role === 'admin')
  const isAdmin = user?.role === 'admin'

  // organizator i admin vide ko je sve prijavljen (samo imena)
  useEffect(() => {
    if (!canManage) return
    listParticipants(id)
      .then(setParticipants)
      .catch(() => setParticipants([]))
  }, [id, canManage, item?.participants])

  const banner = BANNERS[params.get('prijava') ?? '']

  // poruka iz linka se prikazuje jednom, a adresa se čisti
  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setParams({}, { replace: true }), 12000)
    return () => clearTimeout(t)
  }, [banner, setParams])

  if (loading || !ready) return <Spinner />
  if (error) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24">
        <Empty title="Učitavanje nije uspelo" text={errorText(error)} />
      </div>
    )
  }
  if (!item) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-4xl text-sage-deep">Akcija nije pronađena</h1>
        <Link to="/inicijative" className="btn-primary mt-8">
          Nazad na akcije
        </Link>
      </div>
    )
  }

  const status = getStatus(item)
  const mine = item.viewer?.participation ?? null
  const joined = mine === 'confirmed'
  const waiting = mine === 'pending'
  const isOwner = !!item.viewer?.isOrganizer
  const closed = status === 'finished' || status === 'cancelled'
  const full = !!item.capacity && item.participants >= item.capacity && !joined

  async function refresh() {
    const fresh = await getInitiative(id)
    if (fresh) setData(fresh)
  }

  async function onJoin() {
    setBusy(true)
    setActionError('')
    try {
      const res = await join(id)
      if (res.status === 'pending') setSentTo({ email: user?.email ?? '', mailSent: res.mailSent !== false })
      await refresh()
    } catch (err) {
      setActionError(errorText(err))
    }
    setBusy(false)
  }

  async function onGuestJoin(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setActionError('')
    try {
      const res = await join(id, guest)
      setSentTo({ email: guest.email, mailSent: res.mailSent !== false })
    } catch (err) {
      setActionError(errorText(err))
    }
    setBusy(false)
  }

  async function onLeave() {
    setBusy(true)
    setActionError('')
    try {
      await leave(id)
      setSentTo(null)
      await refresh()
    } catch (err) {
      setActionError(errorText(err))
    }
    setBusy(false)
  }

  async function onCancel() {
    if (!confirm('Da li sigurno želiš da otkažeš ovu akciju? Svi prijavljeni dobijaju obaveštenje mejlom.')) return
    setBusy(true)
    try {
      await cancelInitiative(id)
      navigate('/profil')
    } catch (err) {
      setActionError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-8">
      <Link
        to="/inicijative"
        className="mb-8 inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.04em] text-sage-dark hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Sve akcije
      </Link>

      {item.hidden && (
        <p role="status" className="mb-8 flex items-start gap-3 rounded-2xl bg-clay/10 px-5 py-4 text-[14px] font-semibold text-clay">
          <EyeOff className="mt-0.5 size-5 shrink-0" aria-hidden />
          Ova akcija je sakrivena sa javne liste. Vidite je samo vi i admini.
        </p>
      )}

      {banner && (
        <p
          role="status"
          className={`mb-8 flex items-start gap-3 rounded-2xl px-5 py-4 text-[14px] font-semibold ${
            banner.good ? 'bg-sage/15 text-sage-deep' : 'bg-clay/10 text-clay'
          }`}
        >
          {banner.good ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-5 shrink-0" aria-hidden />}
          {banner.text}
        </p>
      )}

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
            {item.description.split(/\n{2,}/).map((p, idx) => (
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

          {item.result?.after && (
            <section className="mt-10" aria-labelledby="rezultat">
              <h2 id="rezultat" className="mb-4 text-2xl text-sage-deep sm:text-3xl">
                Realizovano
              </h2>
              <BeforeAfter before={item.result.before} after={item.result.after} alt={item.title} className="aspect-[4/3] rounded-[2rem] sm:aspect-[16/10]" />
              <div className="mt-6 space-y-4 text-[17px] leading-[1.85] text-ink/85">
                {item.result.text.split(/\n{2,}/).map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage/15 px-4 py-2 text-[13px] font-semibold text-sage-deep">
                <Users className="size-4" aria-hidden /> {item.participants} {item.participants === 1 ? 'volonter' : 'volontera'} je učestvovalo
              </p>
            </section>
          )}

          {canManage && status === 'finished' && (
            <section className="mt-10">
              {resultOpen ? (
                <ResultForm
                  item={item}
                  onCancel={() => setResultOpen(false)}
                  onDone={(updated) => {
                    setData(updated)
                    setResultOpen(false)
                  }}
                />
              ) : item.result ? (
                <div className="flex flex-wrap items-center gap-4 text-[13px] font-semibold">
                  <button onClick={() => setResultOpen(true)} className="btn-secondary">
                    <Pencil className="size-4" aria-hidden /> Izmeni rezultat
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Ukloniti rezultat sa strane „Realizovano“? Akcija ostaje.')) return
                      try {
                        await removeResult(id)
                        await refresh()
                      } catch (err) {
                        setActionError(errorText(err))
                      }
                    }}
                    className="text-clay hover:underline"
                  >
                    Ukloni rezultat
                  </button>
                </div>
              ) : (
                <div className="rounded-3xl bg-sage-dark p-7 text-white sm:p-9">
                  <h2 className="text-2xl text-white sm:text-3xl">Akcija je završena. Pokaži šta ste uradili.</h2>
                  <p className="mt-3 max-w-xl text-white/85">
                    Dodaj slike i kratak opis. Rezultat se objavljuje na strani „Realizovano“ i inspiriše druge u gradu.
                  </p>
                  <button
                    onClick={() => setResultOpen(true)}
                    className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-[14px] font-semibold text-sage-deep transition hover:-translate-y-0.5"
                  >
                    Objavi rezultat
                  </button>
                </div>
              )}
            </section>
          )}

          {canManage && (
            <section className="mt-10 rounded-3xl border border-sand bg-white p-7">
              <h2 className="mb-4 flex items-center gap-3 text-2xl text-sage-deep">
                <Users className="size-6 text-sage-dark" aria-hidden /> Prijavljeni ({participants.length})
              </h2>
              {participants.length === 0 ? (
                <p className="text-[14px] text-ink/60">Još niko nije prijavljen.</p>
              ) : (
                <ul className="divide-y divide-sand text-[14px]">
                  {participants.map((p, idx) => (
                    <li key={idx} className="flex items-center justify-between py-2.5">
                      <span className="font-semibold text-sage-deep">{p.name}</span>
                      <span className={p.status === 'confirmed' ? 'text-sage-dark' : 'text-ink/50'}>
                        {p.status === 'confirmed' ? 'potvrđen/a' : 'čeka potvrdu mejla'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-ink/50">Mejl adrese se ne prikazuju. Volonteri dobijaju sva obaveštenja od nas.</p>
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
              <AvatarStack count={item.participants} size="md" />
              <p className="text-[13px] text-ink/65">
                <strong className="font-display text-3xl font-extrabold text-sage-deep">{item.participants}</strong>
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
                  style={{ width: `${Math.min(100, (item.participants / item.capacity) * 100)}%` }}
                />
              </div>
            ) : null}

            <div className="mt-6">
              {closed ? (
                <button disabled className="btn-primary w-full">
                  {status === 'cancelled' ? 'Akcija je otkazana' : 'Akcija je završena'}
                </button>
              ) : joined ? (
                <>
                  <p className="mb-3 text-center font-display text-xl font-extrabold text-sage-dark">Prijavljen/a si. Vidimo se!</p>
                  <button onClick={onLeave} disabled={busy} className="btn-secondary w-full">
                    Odjavi me
                  </button>
                </>
              ) : waiting || sentTo ? (
                <div className="space-y-3">
                  <p className="rounded-2xl bg-sun/50 p-4 text-[14px] text-sage-deep">
                    <strong>Još jedan korak:</strong> poslali smo mejl{sentTo?.email ? ` na ${sentTo.email}` : ''}. Klikni na link u njemu da potvrdiš
                    prijavu. Proveri i spam.
                    {sentTo && !sentTo.mailSent && (
                      <span className="mt-2 block font-semibold text-clay">
                        Slanje mejla nije uspelo. Pokušaj ponovo kasnije.
                      </span>
                    )}
                  </p>
                  {waiting && (
                    <button onClick={onLeave} disabled={busy} className="btn-secondary w-full">
                      Odustani od prijave
                    </button>
                  )}
                </div>
              ) : full ? (
                <button disabled className="btn-primary w-full">
                  Nema slobodnih mesta
                </button>
              ) : user ? (
                <button onClick={onJoin} disabled={busy} className="btn-primary w-full">
                  {busy ? 'Sačekaj…' : 'Priključi se'}
                </button>
              ) : (
                <form onSubmit={onGuestJoin} className="space-y-4">
                  <p className="text-[13px] text-ink/65">Nalog ti ne treba. Dovoljni su ime i mejl, a mi ti šaljemo detalje.</p>
                  <div>
                    <label className="label" htmlFor="g-name">
                      Ime
                    </label>
                    <input
                      id="g-name"
                      required
                      maxLength={120}
                      autoComplete="name"
                      className="field"
                      value={guest.name}
                      onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="g-email">
                      Mejl adresa
                    </label>
                    <input
                      id="g-email"
                      type="email"
                      required
                      autoComplete="email"
                      className="field"
                      value={guest.email}
                      onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                    />
                  </div>
                  <label className="flex items-start gap-3 text-[12px] leading-snug text-ink/70">
                    <input
                      type="checkbox"
                      required
                      className="mt-0.5 size-5 shrink-0 accent-[#0b7a4b]"
                      checked={guest.consent}
                      onChange={(e) => setGuest({ ...guest, consent: e.target.checked })}
                    />
                    <span>
                      Saglasan/na sam da se moje ime i mejl koriste za ovu prijavu i obaveštenja o akciji (
                      <Link to="/privatnost" className="font-semibold text-sage-dark underline">
                        politika privatnosti
                      </Link>
                      ).
                    </span>
                  </label>
                  <Turnstile />
                  <button disabled={busy} className="btn-primary w-full">
                    {busy ? 'Sačekaj…' : 'Priključi se'}
                  </button>
                  <p className="text-center text-xs text-ink/60">
                    Imaš nalog?{' '}
                    <Link to="/prijava" state={{ from: `/inicijative/${id}` }} className="font-bold text-sage-dark underline">
                      Prijavi se
                    </Link>
                  </p>
                </form>
              )}

              {actionError && (
                <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-[13px] font-semibold text-clay">
                  {actionError}
                </p>
              )}

              {!closed && (
                <ShareInitiative
                  id={item.id}
                  title={item.title}
                  where={cityName(item.cityId)}
                  when={item.kind === 'permanent' ? '' : formatWhen(item)}
                />
              )}

              {canManage && !item.cancelled && (
                <div className="mt-6 space-y-3 border-t border-sand pt-5">
                  <Link to={`/inicijative/${id}/izmena`} className="btn-secondary w-full">
                    <Pencil className="size-4" aria-hidden /> Izmeni akciju
                  </Link>
                  {isOwner && !closed && (
                    <button onClick={onCancel} disabled={busy} className="w-full text-[13px] font-semibold text-clay hover:underline">
                      Otkaži akciju
                    </button>
                  )}
                </div>
              )}
              {isAdmin && (
                <div className="mt-4 border-t border-sand pt-4">
                  <button
                    onClick={async () => {
                      setBusy(true)
                      try {
                        if (item.hidden) await adminUnhideInitiative(id)
                        else if (confirm('Sakriti ovu akciju sa javne liste? Organizator dobija obaveštenje.')) await adminHideInitiative(id)
                        await refresh()
                      } catch (err) {
                        setActionError(errorText(err))
                      }
                      setBusy(false)
                    }}
                    disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 text-[13px] font-semibold text-sage-deep hover:underline"
                  >
                    {item.hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                    {item.hidden ? 'Vrati na javnu listu (admin)' : 'Sakrij sa liste (admin)'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Trajno obrisati ovu akciju zajedno sa svim prijavama? Ovo se ne može vratiti.')) return
                      setBusy(true)
                      try {
                        await adminDeleteInitiative(id)
                        navigate('/inicijative')
                      } catch (err) {
                        setActionError(errorText(err))
                        setBusy(false)
                      }
                    }}
                    disabled={busy}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 text-[13px] font-semibold text-clay hover:underline"
                  >
                    <Trash2 className="size-4" aria-hidden /> Obriši trajno (admin)
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 text-center">
            {reportState === 'done' ? (
              <p className="text-[13px] font-semibold text-sage-dark">Hvala, prijava je primljena. Pregledaćemo je.</p>
            ) : reportOpen ? (
              <form
                className="card space-y-3 p-5 text-left"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setReportState('busy')
                  setReportError('')
                  try {
                    await reportInitiative(id, {
                      reason: report.reason,
                      message: report.message.trim() || undefined,
                      email: !user && report.email.trim() ? report.email.trim() : undefined,
                    })
                    setReportState('done')
                  } catch (err) {
                    setReportError(errorText(err))
                    setReportState('idle')
                  }
                }}
              >
                <div>
                  <label className="label" htmlFor="r-reason">
                    Razlog
                  </label>
                  <select
                    id="r-reason"
                    className="field"
                    value={report.reason}
                    onChange={(e) => setReport({ ...report, reason: e.target.value as ReportReason })}
                  >
                    <option value="spam">Spam ili reklama</option>
                    <option value="neprikladno">Neprikladan sadržaj</option>
                    <option value="lazno">Lažna ili obmanjujuća akcija</option>
                    <option value="bezbednost">Nebezbedno ili opasno</option>
                    <option value="drugo">Drugo</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="r-msg">
                    Poruka <span className="font-normal normal-case tracking-normal text-ink/50">(opciono)</span>
                  </label>
                  <textarea
                    id="r-msg"
                    rows={3}
                    maxLength={1000}
                    className="field py-3"
                    value={report.message}
                    onChange={(e) => setReport({ ...report, message: e.target.value })}
                  />
                </div>
                {!user && (
                  <div>
                    <label className="label" htmlFor="r-mail">
                      Tvoj mejl <span className="font-normal normal-case tracking-normal text-ink/50">(opciono)</span>
                    </label>
                    <input
                      id="r-mail"
                      type="email"
                      className="field"
                      value={report.email}
                      onChange={(e) => setReport({ ...report, email: e.target.value })}
                    />
                  </div>
                )}
                {reportError && <p className="text-[13px] font-semibold text-clay">{reportError}</p>}
                <Turnstile />
                <div className="flex gap-3">
                  <button disabled={reportState === 'busy'} className="btn-primary flex-1">
                    {reportState === 'busy' ? 'Šaljem…' : 'Pošalji prijavu'}
                  </button>
                  <button type="button" onClick={() => setReportOpen(false)} className="btn-secondary">
                    Odustani
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55 hover:text-sage-deep hover:underline"
              >
                <Flag className="size-3.5" aria-hidden /> Prijavi sadržaj
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
