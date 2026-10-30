import { Link, useNavigate } from 'react-router-dom'
import { createInitiative } from '../api'
import { PageHead, Spinner } from '../components/Bits'
import InitiativeForm from '../components/InitiativeForm'
import { useAuth } from '../context/AuthContext'

export default function NewInitiative() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()

  if (!ready) return <Spinner />

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-4xl text-sage-deep">Prijavi se da bi pokrenuo akciju</h1>
        <p className="mt-4 text-ink/70">
          Nalog nam služi da organizator i volonteri znaju ko je ko, i da sprečimo zloupotrebe.
        </p>
        <Link to="/prijava" state={{ from: '/nova-inicijativa' }} className="btn-primary mt-6">
          Prijava ili registracija
        </Link>
      </div>
    )
  }

  if (!user.emailVerified) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-4xl text-sage-deep">Prvo potvrdi mejl adresu</h1>
        <p className="mt-4 text-ink/70">
          Poslali smo poruku na <strong>{user.email}</strong>. Klikni na link u njoj, pa se vrati ovde. Ako je nisi dobio/la,
          možeš da zatražiš novu na svom profilu.
        </p>
        <Link to="/profil" className="btn-primary mt-6">
          Idi na profil
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-6 pt-10">
      <PageHead
        eyebrow="Nova akcija"
        title={
          <>
            Pokreni nešto <em>dobro.</em>
          </>
        }
        text="Opiši šta želiš da uradiš. Ostali iz tvog grada će moći da se prijave."
      />
      <InitiativeForm
        defaultCityId={user.cityId}
        submitLabel="Objavi akciju"
        savingLabel="Objavljivanje…"
        onSubmit={async (data, image) => {
          const item = await createInitiative(data, image instanceof Blob ? image : undefined)
          navigate(`/inicijative/${item.id}`)
        }}
      />
    </div>
  )
}
