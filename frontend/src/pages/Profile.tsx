import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { MailWarning } from 'lucide-react'
import { errorText, listJoined, listMine, resendVerification } from '../api'
import { Empty, PageHead, Spinner } from '../components/Bits'
import InitiativeCard from '../components/InitiativeCard'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../lib/useAsync'

export default function Profile() {
  const { user, ready } = useAuth()
  const mine = useAsync(() => (user ? listMine() : Promise.resolve([])), [user?.id])
  const joined = useAsync(() => (user ? listJoined() : Promise.resolve([])), [user?.id])
  const [resend, setResend] = useState<'idle' | 'busy' | 'sent' | 'failed'>('idle')
  const [resendError, setResendError] = useState('')

  if (!ready) return <Spinner />
  if (!user) return <Navigate to="/prijava" state={{ from: '/profil' }} replace />

  async function onResend() {
    setResend('busy')
    setResendError('')
    try {
      const res = await resendVerification()
      setResend(res.status === 'failed' ? 'failed' : 'sent')
    } catch (err) {
      setResendError(errorText(err))
      setResend('failed')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-10">
      <PageHead
        eyebrow={user.email}
        title={
          <>
            Zdravo, <em>{user.name}</em>
          </>
        }
      />

      {!user.emailVerified && (
        <div className="mb-10 flex flex-wrap items-center gap-4 rounded-3xl bg-sun/50 p-6">
          <MailWarning className="size-8 shrink-0 text-sage-deep" aria-hidden />
          <div className="min-w-0 flex-1 text-[14px] text-sage-deep">
            <p className="font-bold">Potvrdi mejl adresu da bi mogao/la da pokrećeš akcije.</p>
            <p className="text-sage-deep/80">
              Poslali smo link na {user.email}. Proveri i spam.
              {resend === 'sent' && ' Nova poruka je poslata.'}
              {resend === 'failed' && ` Slanje nije uspelo. ${resendError}`}
            </p>
          </div>
          <button onClick={onResend} disabled={resend === 'busy' || resend === 'sent'} className="btn-secondary">
            {resend === 'busy' ? 'Šaljem…' : 'Pošalji ponovo'}
          </button>
        </div>
      )}

      <section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl text-sage-deep">Akcije koje sam pokrenuo/la</h2>
          <Link to="/nova-inicijativa" className="btn-primary">
            Nova akcija
          </Link>
        </div>
        {mine.loading ? (
          <Spinner />
        ) : mine.error ? (
          <Empty title="Učitavanje nije uspelo" text={errorText(mine.error)} />
        ) : mine.data?.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mine.data.map((i) => (
              <InitiativeCard key={i.id} item={i} />
            ))}
          </div>
        ) : (
          <Empty title="Još nisi pokrenuo/la nijednu akciju" text="Kada pokreneš prvu, pojaviće se ovde." />
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-6 text-3xl text-sage-deep">Na koje sam se prijavio/la</h2>
        {joined.loading ? (
          <Spinner />
        ) : joined.error ? (
          <Empty title="Učitavanje nije uspelo" text={errorText(joined.error)} />
        ) : joined.data?.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {joined.data.map((i) => (
              <InitiativeCard key={i.id} item={i} />
            ))}
          </div>
        ) : (
          <Empty title="Nisi prijavljen/a ni na jednu akciju" text="Pogledaj šta se dešava u tvom gradu." />
        )}
      </section>
    </div>
  )
}
