import { Link, Navigate } from 'react-router-dom'
import { listJoined, listMine } from '../api'
import { Empty, Spinner } from '../components/Bits'
import InitiativeCard from '../components/InitiativeCard'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../lib/useAsync'

export default function Profile() {
  const { user } = useAuth()
  const mine = useAsync(() => (user ? listMine(user.id) : Promise.resolve([])), [user?.id])
  const joined = useAsync(() => listJoined(), [])

  if (!user) return <Navigate to="/prijava" state={{ from: '/profil' }} replace />

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl text-sage-deep">Zdravo, {user.name}</h1>
      <p className="mt-1 text-ink/70">{user.email}</p>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl text-sage-deep">Inicijative koje sam pokrenuo/la</h2>
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
        <h2 className="mb-4 text-2xl text-sage-deep">Na koje sam se prijavio/la</h2>
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
