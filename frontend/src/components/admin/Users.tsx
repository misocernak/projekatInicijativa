import { useEffect, useState } from 'react'
import { Mail, ShieldCheck, ShieldOff } from 'lucide-react'
import { adminSendPasswordLink, adminSetRole, adminUsers, errorText, type AdminUser } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../lib/useAsync'
import { Empty, Spinner } from '../Bits'

const dateFmt = new Intl.DateTimeFormat('sr-Latn-RS', { dateStyle: 'medium' })

function Badge({ children, tone }: { children: string; tone: 'admin' | 'warn' | 'quiet' }) {
  const cls =
    tone === 'admin' ? 'bg-sage-dark text-white' : tone === 'warn' ? 'bg-sun/60 text-sage-deep' : 'bg-mist text-ink/60'
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>
}

export default function Users() {
  const { user: me } = useAuth()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [adminsOnly, setAdminsOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const { data, loading, error, reload } = useAsync(
    () => adminUsers({ q: debounced, role: adminsOnly ? 'admin' : undefined, page }),
    [debounced, adminsOnly, page],
  )

  async function toggle(u: AdminUser) {
    const grant = u.role !== 'admin'
    const ok = confirm(
      grant
        ? `Postaviti ${u.name} (${u.email}) za admina? Dobija pristup statistici, nalozima i moderaciji, i stiže mu mejl.`
        : `Skinuti admin ulogu korisniku ${u.name} (${u.email})?`,
    )
    if (!ok) return
    setBusyId(u.id)
    setActionError('')
    setNotice('')
    try {
      await adminSetRole(u.id, grant ? 'admin' : 'user')
      setNotice(grant ? `${u.name} je sada admin.` : `${u.name} više nije admin.`)
      reload()
    } catch (err) {
      setActionError(errorText(err))
    }
    setBusyId(null)
  }

  async function sendLink(u: AdminUser) {
    if (!confirm(`Poslati ${u.email} mejl sa linkom da postavi lozinku i aktivira nalog?`)) return
    setBusyId(u.id)
    setActionError('')
    setNotice('')
    try {
      await adminSendPasswordLink(u.id)
      setNotice(`Link za lozinku je poslat na ${u.email}.`)
    } catch (err) {
      setActionError(errorText(err))
    }
    setBusyId(null)
  }

  function blockedReason(u: AdminUser): string | null {
    if (u.id === me?.id) return 'Svoju ulogu ne možeš da menjaš'
    if (u.role !== 'admin' && !u.emailVerified) return 'Nalog mora da ima potvrđen mejl'
    return null
  }

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="u-q">
            Pretraga naloga
          </label>
          <input
            id="u-q"
            type="search"
            className="field"
            placeholder="Ime ili mejl…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-sand bg-white px-4 text-[13px] font-semibold text-sage-deep">
          <input
            type="checkbox"
            className="size-5 accent-[#0b7a4b]"
            checked={adminsOnly}
            onChange={(e) => {
              setAdminsOnly(e.target.checked)
              setPage(1)
            }}
          />
          Samo admini
        </label>
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-xl bg-sage/15 px-4 py-3 text-sm font-semibold text-sage-deep">
          {notice}
        </p>
      )}
      {actionError && (
        <p role="alert" className="mb-4 rounded-xl bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">
          {actionError}
        </p>
      )}

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <Empty title="Učitavanje nije uspelo" text={errorText(error)} />
      ) : !data?.data.length ? (
        <Empty title="Nema naloga za ovu pretragu" />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-ink/60" aria-live="polite">
            Ukupno: {data.meta.total}
          </p>
          <ul className="space-y-3">
            {data.data.map((u) => {
              const blocked = blockedReason(u)
              return (
                <li key={u.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sage-deep">{u.name}</span>
                      {u.role === 'admin' && <Badge tone="admin">admin</Badge>}
                      {!u.emailVerified && <Badge tone="warn">mejl nije potvrđen</Badge>}
                      {!u.hasPassword && <Badge tone="quiet">brza prijava</Badge>}
                      {u.id === me?.id && <Badge tone="quiet">to si ti</Badge>}
                    </div>
                    <p className="truncate text-[13px] text-ink/65">{u.email}</p>
                    {!u.hasPassword && (
                      <p className="mt-1 text-xs text-ink/60">
                        Prijavio/la se na inicijativu samo mejlom, nema lozinku i ne može da se prijavi na sajt dok je ne postavi.
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink/50">
                      {u.initiatives} inicijativa · {u.participations} prijava
                      {u.createdAt && ` · od ${dateFmt.format(new Date(u.createdAt))}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                  {!u.hasPassword && (
                    <button onClick={() => sendLink(u)} disabled={busyId === u.id} className="btn-secondary min-h-10 px-5">
                      <Mail className="size-4" aria-hidden /> Pošalji link za aktivaciju
                    </button>
                  )}
                  <button
                    onClick={() => toggle(u)}
                    disabled={busyId === u.id || !!blocked}
                    title={blocked ?? undefined}
                    className={`${u.role === 'admin' ? 'btn-secondary' : 'btn-primary'} min-h-10 px-5`}
                  >
                    {u.role === 'admin' ? (
                      <>
                        <ShieldOff className="size-4" aria-hidden /> Skini admina
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-4" aria-hidden /> Postavi za admina
                      </>
                    )}
                  </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {data.meta.lastPage > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button className="btn-secondary min-h-10 px-5" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Prethodna
              </button>
              <span className="text-[13px] text-ink/60">
                Strana {data.meta.page} od {data.meta.lastPage}
              </span>
              <button className="btn-secondary min-h-10 px-5" disabled={page >= data.meta.lastPage} onClick={() => setPage(page + 1)}>
                Sledeća
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
