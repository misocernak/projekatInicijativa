import { Link, Navigate } from 'react-router-dom'
import { listJoined, listMine } from '../api'
import { Empty, PageHead, Spinner } from '../components/Bits'
import InitiativeCard from '../components/InitiativeCard'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../lib/useAsync'

export default function Profile() {
  const { user } = useAuth()
  const mine = useAsync(() => (user ? listMine(user.id) : Promise.resolve([])), [user?.id])
  const joined = useAsync(() => listJoined(), [])

  if (!user) return <Navigate to="/prijava" state={{ from: '/profil' }} replace />

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-10">
      <PageHead eyebrow={user.email} title={<>Zdravo, <em>{user.name}</em></>} />

      <section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl text-sage-deep">Inicijative koje sam pokrenuo/la</h2>
          <Link to="/nova-inicijativa" className="btn-primary">
            Nova inicijativa
          </Link>
        </div>
        {mine.loading ? (
          <Spinner />
        ) : mine.data?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mine.data.map((i) => (
              <InitiativeCard key={i.id} item={i} />
            ))}
          </div>
        ) : (
          <Empty title="Još nisi pokrenuo/la nijednu inicijativu" text="Kada pokreneš prvu, pojaviće se ovde." />
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-6 text-3xl text-sage-deep">Na koje sam se prijavio/la</h2>
        {joined.loading ? (
          <Spinner />
        ) : joined.data?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {joined.data.map((i) => (
              <InitiativeCard key={i.id} item={i} />
            ))}
          </div>
        ) : (
          <Empty title="Nisi prijavljen/a ni na jednu inicijativu" text="Pogledaj šta se dešava u tvom gradu." />
        )}
      </section>
    </div>
  )
}
