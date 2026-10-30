import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { errorText, forgotPassword, resetPassword } from '../api'
import { useAuth } from '../context/AuthContext'

/** /potvrda-mejla?status=ok|invalid: na ovu stranu vodi link iz mejla za potvrdu adrese. */
export function ConfirmEmail() {
  const [params] = useSearchParams()
  const { user, refresh } = useAuth()
  const ok = params.get('status') === 'ok'

  // ako je korisnik prijavljen u ovom pretraživaču, osveži podatke da vidi da je potvrđen
  useEffect(() => {
    if (ok) void refresh()
  }, [ok, refresh])

  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      {ok ? (
        <CheckCircle2 className="mx-auto size-14 text-sage-dark" aria-hidden />
      ) : (
        <XCircle className="mx-auto size-14 text-clay" aria-hidden />
      )}
      <h1 className="mt-6 text-4xl text-sage-deep">{ok ? 'Mejl adresa je potvrđena' : 'Link nije važeći'}</h1>
      <p className="mt-4 text-ink/70">
        {ok
          ? 'Hvala! Sada možeš da pokrećeš inicijative.'
          : 'Link je istekao ili je već iskorišćen. Prijavi se pa zatraži novu poruku sa profila.'}
      </p>
      <Link to={ok && user ? '/nova-inicijativa' : '/prijava'} className="btn-primary mt-8">
        {ok && user ? 'Pokreni inicijativu' : 'Prijavi se'}
      </Link>
    </div>
  )
}

/** Zahtev za link za novu lozinku. Uvek isti odgovor, bez obzira da li nalog postoji. */
export function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim()
    setBusy(true)
    setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(errorText(err))
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <span className="eyebrow">Nalog</span>
      <h1 className="text-4xl text-sage-deep">Zaboravljena lozinka</h1>
      {sent ? (
        <div className="card mt-6 p-7">
          <p className="text-ink/80">
            Ako postoji nalog sa tom mejl adresom, poslali smo link za postavljanje nove lozinke. Proveri i spam.
          </p>
          <Link to="/prijava" className="btn-secondary mt-6">
            Nazad na prijavu
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card mt-6 space-y-5 p-7">
          <p className="text-[14px] text-ink/70">
            Unesi mejl adresu. Ovo važi i ako si se samo prijavio/la na inicijativu, pa želiš da napraviš lozinku.
          </p>
          <div>
            <label className="label" htmlFor="email">
              Mejl adresa
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className="field" />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn-primary w-full">
            {busy ? 'Sačekaj…' : 'Pošalji link'}
          </button>
        </form>
      )}
    </div>
  )
}

/** /nova-lozinka?token=..&email=..: stiže se sa linka iz mejla. */
export function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      await resetPassword({
        token,
        email,
        password: String(f.get('password') ?? ''),
        password_confirmation: String(f.get('password_confirmation') ?? ''),
      })
      await refresh()
      setDone(true)
      setTimeout(() => navigate('/prijava'), 2500)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-4xl text-sage-deep">Link nije potpun</h1>
        <p className="mt-4 text-ink/70">Otvori link iz mejla ponovo ili zatraži novi.</p>
        <Link to="/zaboravljena-lozinka" className="btn-primary mt-8">
          Zatraži novi link
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <span className="eyebrow">Nalog</span>
      <h1 className="text-4xl text-sage-deep">Nova lozinka</h1>
      {done ? (
        <p className="card mt-6 p-7 text-ink/80">Lozinka je postavljena. Prebacujemo te na prijavu…</p>
      ) : (
        <form onSubmit={onSubmit} className="card mt-6 space-y-5 p-7">
          <p className="text-[14px] text-ink/70">
            Nalog: <strong>{email}</strong>
          </p>
          <div>
            <label className="label" htmlFor="password">
              Nova lozinka
            </label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
          </div>
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
          {error && (
            <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn-primary w-full">
            {busy ? 'Sačekaj…' : 'Postavi lozinku'}
          </button>
        </form>
      )}
    </div>
  )
}
