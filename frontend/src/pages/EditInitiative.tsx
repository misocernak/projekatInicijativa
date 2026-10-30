import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteInitiativeImage, errorText, getInitiative, updateInitiative, uploadInitiativeImage } from '../api'
import { Empty, PageHead, Spinner } from '../components/Bits'
import InitiativeForm from '../components/InitiativeForm'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../lib/useAsync'

export default function EditInitiative() {
  const { id = '' } = useParams()
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const { data: item, loading, error } = useAsync(() => getInitiative(id), [id, user?.id])

  if (loading || !ready) return <Spinner />
  if (error) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24">
        <Empty title="Učitavanje nije uspelo" text={errorText(error)} />
      </div>
    )
  }

  const allowed = !!item && !!user && (item.viewer?.isOrganizer || user.role === 'admin')

  if (!item || !allowed) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-4xl text-sage-deep">{item ? 'Nemaš dozvolu' : 'Inicijativa nije pronađena'}</h1>
        <p className="mt-4 text-ink/70">
          {item ? 'Inicijativu može da menja samo organizator.' : 'Možda je uklonjena ili je link pogrešan.'}
        </p>
        <Link to={user ? '/inicijative' : '/prijava'} state={{ from: `/inicijative/${id}/izmena` }} className="btn-primary mt-8">
          {user ? 'Nazad na inicijative' : 'Prijavi se'}
        </Link>
      </div>
    )
  }

  if (item.cancelled) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-4xl text-sage-deep">Inicijativa je otkazana</h1>
        <p className="mt-4 text-ink/70">Otkazana inicijativa se ne može menjati.</p>
        <Link to={`/inicijative/${id}`} className="btn-primary mt-8">
          Nazad
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-6 pt-10">
      <PageHead eyebrow="Izmena" title={<>Izmeni inicijativu</>} text="Promene vremena i mesta stižu svim prijavljenima mejlom." />
      <InitiativeForm
        initial={item}
        submitLabel="Sačuvaj izmene"
        savingLabel="Čuvanje…"
        onSubmit={async (data, image) => {
          await updateInitiative(id, data)
          if (image instanceof Blob) await uploadInitiativeImage(id, image)
          else if (image === null && item.image) await deleteInitiativeImage(id)
          navigate(`/inicijative/${id}`)
        }}
      />
    </div>
  )
}
