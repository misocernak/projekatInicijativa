import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorText } from '../api'
import { useAuth } from '../context/AuthContext'
import { CITIES } from '../data/constants'

export default function Auth() {
  const { user, ready, login, register } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/profil'
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (ready && user) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const s = (k: string) => String(f.get(k) ?? '').trim()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') {
        await login(s('email'), String(f.get('password') ?? ''))
      } else {
        await register({
          name: s('name'),
          email: s('email'),
          password: String(f.get('password') ?? ''),
          password_confirmation: String(f.get('password_confirmation') ?? ''),
          city: s('city') || undefined,
          consent: f.get('consent') === 'on',
        })
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <span className="eyebrow">Nalog</span>
      <h1 className="text-4xl text-sage-deep">{mode === 'login' ? 'Dobro došao/la nazad' : 'Pridruži se'}</h1>
      {mode === 'register' && (
        <p className="mt-4 text-[14px] text-ink/70">
          Nalog ti treba da bi pokretao/la inicijative. Za prijavu na tuđu inicijativu dovoljni su ti ime i mejl, bez naloga.
        </p>
      )}

      <form onSubmit={onSubmit} className="card mt-6 space-y-5 p-7">
        {mode === 'register' && (
          <>
            <div>
              <label className="label" htmlFor="name">
                Ime
              </label>
              <input id="name" name="name" required autoComplete="name" maxLength={120} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="city">
                Grad
              </label>
              <select id="city" name="city" className="field" defaultValue="">
                <option value="">Izaberi grad</option>
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="email">
            Mejl adresa
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Lozinka
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="field"
          />
          {mode === 'register' && <p className="mt-1.5 text-xs text-ink/55">Najmanje 8 znakova.</p>}
        </div>
        {mode === 'register' && (
          <>
            <div>
              <label className="label" htmlFor="password_confirmation">
                Ponovi lozinku
              </label>
              <input
                id="password_confirmation"
                name="password_confirmation"
                type="password"
                required
                autoComplete="new-password"
                className="field"
              />
            </div>
            <label className="flex items-start gap-3 text-[13px] leading-snug text-ink/75">
              <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[#0b7a4b]" />
              <span>
                Saglasan/na sam da platforma čuva moje podatke (ime i mejl) radi organizovanja inicijativa i slanja obaveštenja.
              </span>
            </label>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">
            {error}
          </p>
        )}

        <button disabled={busy} className="btn-primary w-full">
          {busy ? 'Sačekaj…' : mode === 'login' ? 'Prijavi se' : 'Napravi nalog'}
        </button>
        {mode === 'login' && (
          <p className="text-center text-[13px]">
            <Link to="/zaboravljena-lozinka" className="font-semibold text-sage-dark hover:underline">
              Zaboravljena lozinka?
            </Link>
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-ink/70">
        {mode === 'login' ? 'Nemaš nalog?' : 'Već imaš nalog?'}{' '}
        <button
          className="font-bold text-sage-dark underline"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
        >
          {mode === 'login' ? 'Registruj se' : 'Prijavi se'}
        </button>
      </p>
    </div>
  )
}
