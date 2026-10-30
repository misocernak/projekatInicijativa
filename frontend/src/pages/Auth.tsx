import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { errorText } from '../api'
import CityOptions from '../components/CityOptions'
import PasswordField from '../components/PasswordField'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const { user, ready, login, register } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/profil'
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // mejl je već korišćen za prijavu na inicijativu bez naloga: poslat je link za postavljanje lozinke
  const [activation, setActivation] = useState<{ email: string; mailSent: boolean } | null>(null)

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
        navigate(from, { replace: true })
      } else {
        const res = await register({
          name: s('name'),
          email: s('email'),
          password: String(f.get('password') ?? ''),
          password_confirmation: String(f.get('password_confirmation') ?? ''),
          city: s('city') || undefined,
          consent: f.get('consent') === 'on',
        })
        if (res.activationSent) {
          setActivation({ email: s('email'), mailSent: res.mailSent })
          setBusy(false)
        } else {
          navigate(from, { replace: true })
        }
      }
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  if (activation) {
    return (
      <div className="mx-auto max-w-md px-5 py-14">
        <span className="eyebrow">Nalog</span>
        <h1 className="text-4xl text-sage-deep">Još jedan korak</h1>
        <div className="card mt-6 space-y-4 p-7">
          <MailCheck className="size-10 text-sage-dark" aria-hidden />
          <p className="text-[15px] text-ink/85">
            Sa adresom <strong>{activation.email}</strong> si se već prijavio/la na inicijativu, bez lozinke. Da završiš registraciju,
            poslali smo ti mejl sa linkom za postavljanje lozinke.
          </p>
          {!activation.mailSent && (
            <p className="rounded-xl bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">
              Slanje mejla nije uspelo. Pokušaj ponovo kasnije, ili koristi „Zaboravljena lozinka“.
            </p>
          )}
          <p className="text-[13px] text-ink/60">Proveri i spam. Tvoje prijave na inicijative ostaju sačuvane.</p>
          <button
            className="btn-secondary w-full"
            onClick={() => {
              setActivation(null)
              setMode('login')
            }}
          >
            Nazad na prijavu
          </button>
        </div>
      </div>
    )
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
                Grad ili opština
              </label>
              <select id="city" name="city" className="field" defaultValue="">
                <option value="">Izaberi grad</option>
                <CityOptions />
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
        <PasswordField
          id="password"
          name="password"
          label="Lozinka"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={mode === 'register' ? 8 : undefined}
          hint={mode === 'register' ? 'Najmanje 8 znakova.' : undefined}
        />
        {mode === 'register' && (
          <>
            <PasswordField id="password_confirmation" name="password_confirmation" label="Ponovi lozinku" autoComplete="new-password" />
            <label className="flex items-start gap-3 text-[13px] leading-snug text-ink/75">
              <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[#0b7a4b]" />
              <span>
                Saglasan/na sam da platforma čuva moje podatke (ime i mejl) radi organizovanja inicijativa i slanja obaveštenja, i
                prihvatam{' '}
                <Link to="/uslovi" className="font-semibold text-sage-dark underline">
                  uslove korišćenja
                </Link>{' '}
                i{' '}
                <Link to="/privatnost" className="font-semibold text-sage-dark underline">
                  politiku privatnosti
                </Link>
                .
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
          <div className="space-y-2 text-center text-[13px]">
            <p>
              <Link to="/zaboravljena-lozinka" className="font-semibold text-sage-dark hover:underline">
                Zaboravljena lozinka?
              </Link>
            </p>
            <p className="rounded-xl bg-mist px-4 py-3 text-left text-ink/70">
              Prijavio/la si se na inicijativu samo mejlom? Izaberi <strong>Registruj se</strong> sa istom mejl adresom i poslaćemo ti
              link da postaviš lozinku.
            </p>
          </div>
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
