import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MailCheck, Sparkles, UserRoundCheck } from 'lucide-react'
import { authProviders, errorText, forgotPassword, googleLoginUrl } from '../api'
import CityOptions from '../components/CityOptions'
import GoogleG from '../components/GoogleG'
import PasswordField from '../components/PasswordField'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../lib/useAsync'

type Mode = 'login' | 'register'
/** Registracija: prvo se bira da li je korisnik nov ili se već prijavljivao na inicijative bez naloga. */
type Kind = 'choose' | 'new' | 'returning'

/** Poruke kada se korisnik vrati sa Google-a bez uspešne prijave (?google=...). */
const GOOGLE_MESSAGES: Record<string, string> = {
  odbijeno: 'Prijava preko Google-a je otkazana.',
  greska: 'Prijava preko Google-a nije uspela. Pokušaj ponovo ili se prijavi mejlom.',
  nepotvrdjen: 'Google nalog nema potvrđenu mejl adresu, pa se ne može koristiti za prijavu.',
  'nije-podeseno': 'Prijava preko Google-a još nije podešena.',
}

export default function Auth() {
  const { user, ready, login, register } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/profil'
  const [mode, setMode] = useState<Mode>('login')
  const [kind, setKind] = useState<Kind>('choose')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // poslat je mejl sa linkom za postavljanje lozinke
  const [linkSent, setLinkSent] = useState<{ email: string; mailSent: boolean } | null>(null)
  const [params] = useSearchParams()
  const googleMessage = GOOGLE_MESSAGES[params.get('google') ?? '']
  const providers = useAsync(() => authProviders().catch(() => ({ google: false })), [])

  if (ready && user) return <Navigate to={from} replace />

  function switchMode(next: Mode) {
    setMode(next)
    setKind('choose')
    setError('')
  }

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
      } else if (kind === 'returning') {
        // isti mehanizam kao "zaboravljena lozinka": za nalog bez lozinke stiže mejl "Aktiviraj svoj nalog",
        // a odgovor je isti bez obzira da li adresa postoji
        await forgotPassword(s('email'))
        setLinkSent({ email: s('email'), mailSent: true })
        setBusy(false)
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
          // izabrao je "nov sam", a mejl već ima nalog bez lozinke: i tada dobija link
          setLinkSent({ email: s('email'), mailSent: res.mailSent })
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

  if (linkSent) {
    return (
      <div className="mx-auto max-w-md px-5 py-14">
        <span className="eyebrow">Nalog</span>
        <h1 className="text-4xl text-sage-deep">Proveri mejl</h1>
        <div className="card mt-6 space-y-4 p-7">
          <MailCheck className="size-10 text-sage-dark" aria-hidden />
          <p className="text-[15px] text-ink/85">
            Ako je adresa <strong>{linkSent.email}</strong> korišćena za prijavu na inicijativu, poslali smo joj mejl sa linkom za
            postavljanje lozinke. Klikni na link i nalog je spreman.
          </p>
          {!linkSent.mailSent && (
            <p className="rounded-xl bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">
              Slanje mejla nije uspelo. Pokušaj ponovo kasnije.
            </p>
          )}
          <p className="text-[13px] text-ink/60">Proveri i spam. Tvoje prijave na inicijative ostaju sačuvane.</p>
          <button
            className="btn-secondary w-full"
            onClick={() => {
              setLinkSent(null)
              switchMode('login')
            }}
          >
            Nazad na prijavu
          </button>
        </div>
      </div>
    )
  }

  const choosing = mode === 'register' && kind === 'choose'
  const showGoogle = !!providers.data?.google && !(mode === 'register' && kind === 'returning')

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <span className="eyebrow">Nalog</span>
      <h1 className="text-4xl text-sage-deep">{mode === 'login' ? 'Dobro došao/la nazad' : 'Pridruži se'}</h1>

      {googleMessage && (
        <p role="alert" className="mt-5 rounded-xl bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">
          {googleMessage}
        </p>
      )}

      {showGoogle && (
        <div className="mt-6">
          <a href={googleLoginUrl(from)} className="btn-secondary w-full gap-3">
            <GoogleG /> Nastavi sa Google nalogom
          </a>
          <p className="mt-2 text-center text-xs text-ink/55">
            Nastavkom prihvataš{' '}
            <Link to="/uslovi" className="underline">
              uslove
            </Link>{' '}
            i{' '}
            <Link to="/privatnost" className="underline">
              politiku privatnosti
            </Link>
            .
          </p>
          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">
            <span className="h-px flex-1 bg-sand" />
            ili mejlom
            <span className="h-px flex-1 bg-sand" />
          </div>
        </div>
      )}

      {choosing ? (
        <div className="mt-6 space-y-4">
          <p className="text-[14px] text-ink/70">Ko si ti?</p>
          <button
            onClick={() => setKind('new')}
            className="card flex w-full items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sage/15 text-sage-dark">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-xl font-extrabold text-sage-deep">Potpuno sam nov/a</span>
              <span className="mt-0.5 block text-[13px] text-ink/65">Pravim nalog da bih pokretao/la inicijative.</span>
            </span>
          </button>
          <button
            onClick={() => setKind('returning')}
            className="card flex w-full items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sun/50 text-sage-deep">
              <UserRoundCheck className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-xl font-extrabold text-sage-deep">Već sam se prijavljivao/la na inicijative</span>
              <span className="mt-0.5 block text-[13px] text-ink/65">Prijavio/la sam se samo mejlom i želim pravi nalog.</span>
            </span>
          </button>
        </div>
      ) : (
        <>
          {mode === 'register' && (
            <button
              onClick={() => {
                setKind('choose')
                setError('')
              }}
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-sage-dark hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden /> Promeni izbor
            </button>
          )}
          {mode === 'register' && kind === 'new' && (
            <p className="mt-4 text-[14px] text-ink/70">
              Nalog ti treba da bi pokretao/la inicijative. Za prijavu na tuđu inicijativu dovoljni su ti ime i mejl, bez naloga.
            </p>
          )}
          {mode === 'register' && kind === 'returning' && (
            <p className="mt-4 text-[14px] text-ink/70">
              Upiši mejl adresu kojom si se prijavljivao/la na inicijative. Poslaćemo ti link na koji postavljaš lozinku, i to je sve.
            </p>
          )}

          <form onSubmit={onSubmit} className="card mt-6 space-y-5 p-7">
            {mode === 'register' && kind === 'new' && (
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
            {!(mode === 'register' && kind === 'returning') && (
              <PasswordField
                id="password"
                name="password"
                label="Lozinka"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 8 : undefined}
                hint={mode === 'register' ? 'Najmanje 8 znakova.' : undefined}
              />
            )}
            {mode === 'register' && kind === 'new' && (
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
              {busy
                ? 'Sačekaj…'
                : mode === 'login'
                  ? 'Prijavi se'
                  : kind === 'returning'
                    ? 'Pošalji mi link za lozinku'
                    : 'Napravi nalog'}
            </button>
            {mode === 'login' && (
              <p className="text-center text-[13px]">
                <Link to="/zaboravljena-lozinka" className="font-semibold text-sage-dark hover:underline">
                  Zaboravljena lozinka?
                </Link>
              </p>
            )}
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-ink/70">
        {mode === 'login' ? 'Nemaš nalog?' : 'Već imaš nalog?'}{' '}
        <button className="font-bold text-sage-dark underline" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Registruj se' : 'Prijavi se'}
        </button>
      </p>
    </div>
  )
}
