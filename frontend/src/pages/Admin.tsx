import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Check, Eye, EyeOff } from 'lucide-react'
import {
  adminHideInitiative,
  adminReports,
  adminResolveReport,
  adminUnhideInitiative,
  errorText,
  type AdminReport,
  type ReportReason,
} from '../api'
import { Empty, PageHead, Spinner } from '../components/Bits'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../lib/useAsync'

const REASON_LABEL: Record<ReportReason, string> = {
  spam: 'Spam ili reklama',
  neprikladno: 'Neprikladan sadržaj',
  lazno: 'Lažna ili obmanjujuća',
  bezbednost: 'Nebezbedno ili opasno',
  drugo: 'Drugo',
}

const dateFmt = new Intl.DateTimeFormat('sr-Latn-RS', { dateStyle: 'medium', timeStyle: 'short' })

export default function Admin() {
  const { user, ready } = useAuth()
  const [tab, setTab] = useState<'open' | 'resolved'>('open')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  const { data, loading, error, reload } = useAsync(() => (user?.role === 'admin' ? adminReports(tab) : Promise.resolve([])), [tab, user?.id])

  if (!ready) return <Spinner />
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />

  async function act(r: AdminReport, action: 'resolve' | 'hide' | 'unhide') {
    if (action === 'hide' && !confirm(`Sakriti „${r.initiative.title}“ sa javne liste? Organizator dobija obaveštenje.`)) return
    setBusyId(r.id)
    setActionError('')
    try {
      if (action === 'resolve') await adminResolveReport(r.id)
      else if (action === 'hide') await adminHideInitiative(r.initiative.id)
      else await adminUnhideInitiative(r.initiative.id)
      reload()
    } catch (err) {
      setActionError(errorText(err))
    }
    setBusyId(null)
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-6 pt-10">
      <PageHead eyebrow="Admin" title="Prijavljen sadržaj" text="Pregledaj prijave, sakrij sporne inicijative ili ih označi kao rešene." />

      <div className="mb-6 flex rounded-full bg-sand/80 p-1" role="group" aria-label="Status prijava">
        {(['open', 'resolved'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`flex-1 min-h-10 rounded-full px-5 text-[13px] font-semibold transition ${
              tab === t ? 'bg-sage-dark text-cream shadow-sm' : 'text-sage-deep hover:bg-white/60'
            }`}
          >
            {t === 'open' ? 'Otvorene' : 'Rešene'}
          </button>
        ))}
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-xl bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">
          {actionError}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <Empty title="Učitavanje nije uspelo" text={errorText(error)} />
      ) : !data?.length ? (
        <Empty title={tab === 'open' ? 'Nema otvorenih prijava' : 'Nema rešenih prijava'} />
      ) : (
        <ul className="space-y-4">
          {data.map((r) => (
            <li key={r.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/inicijative/${r.initiative.id}`} className="font-display text-xl font-extrabold text-sage-deep hover:underline">
                    {r.initiative.title}
                  </Link>
                  <p className="mt-1 text-[13px] text-ink/60">
                    Organizator: {r.initiative.organizerName}
                    {r.initiative.hidden && <span className="ml-2 rounded-full bg-clay/10 px-2 py-0.5 text-xs font-bold text-clay">sakrivena</span>}
                  </p>
                </div>
                <span className="rounded-full bg-sun/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sage-deep">
                  {REASON_LABEL[r.reason]}
                </span>
              </div>
              {r.message && <p className="mt-4 rounded-2xl bg-mist px-4 py-3 text-[14px] text-ink/80">{r.message}</p>}
              <p className="mt-3 text-xs text-ink/55">
                {dateFmt.format(new Date(r.createdAt))} · Prijavio/la:{' '}
                {r.reporter ? `${r.reporter.name ?? 'gost'} (${r.reporter.email})` : 'anonimno'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {r.initiative.hidden ? (
                  <button onClick={() => act(r, 'unhide')} disabled={busyId === r.id} className="btn-secondary min-h-10 px-5">
                    <Eye className="size-4" aria-hidden /> Vrati na listu
                  </button>
                ) : (
                  <button onClick={() => act(r, 'hide')} disabled={busyId === r.id} className="btn-primary min-h-10 px-5">
                    <EyeOff className="size-4" aria-hidden /> Sakrij inicijativu
                  </button>
                )}
                {r.status === 'open' && (
                  <button onClick={() => act(r, 'resolve')} disabled={busyId === r.id} className="btn-secondary min-h-10 px-5">
                    <Check className="size-4" aria-hidden /> Reši bez akcije
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
