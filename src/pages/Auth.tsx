import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CITIES } from '../data/constants'

export default function Auth() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/profil'
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email'))
    setBusy(true)
    if (mode === 'login') await login(email)
    else await register(String(f.get('name')), email, String(f.get('city')) || undefined)
    navigate(from, { replace: true })
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-4xl text-sage-deep">{mode === 'login' ? 'Prijava' : 'Napravi nalog'}</h1>
      <p className="mt-2 rounded-xl bg-sand/70 px-4 py-3 text-sm text-ink/80">
        Ovo je demo verzija: nalozi i prijave se čuvaju samo u tvom pretraživaču, dok ne povežemo server.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === 'register' && (
          <>
            <div>
              <label className="label" htmlFor="name">
                Ime
              </label>
              <input id="name" name="name" required autoComplete="name" className="field" />
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
            Email
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
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="field"
          />
        </div>
        <button disabled={busy} className="btn-primary w-full">
          {mode === 'login' ? 'Prijavi se' : 'Registruj se'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/75">
        {mode === 'login' ? 'Nemaš nalog?' : 'Već imaš nalog?'}{' '}
        <button
          className="font-bold text-sage-dark underline"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Registruj se' : 'Prijavi se'}
        </button>
      </p>
    </div>
  )
}
