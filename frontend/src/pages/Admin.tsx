import { Navigate, useSearchParams } from 'react-router-dom'
import { PageHead, Spinner } from '../components/Bits'
import Reports from '../components/admin/Reports'
import Stats from '../components/admin/Stats'
import Users from '../components/admin/Users'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'pregled', label: 'Pregled' },
  { id: 'prijave', label: 'Prijave sadržaja' },
  { id: 'nalozi', label: 'Nalozi' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function Admin() {
  const { user, ready } = useAuth()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : 'pregled'

  if (!ready) return <Spinner />
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-10">
      <PageHead eyebrow="Admin" title="Upravljanje sajtom" text="Statistika, moderacija i nalozi na jednom mestu." />

      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Admin odeljci">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams(t.id === 'pregled' ? {} : { tab: t.id }, { replace: true })}
            className={`min-h-10 rounded-full px-5 text-[13px] font-semibold transition ${
              tab === t.id ? 'bg-sage-deep text-white' : 'bg-sand/80 text-sage-deep hover:bg-sand'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pregled' && <Stats />}
      {tab === 'prijave' && <Reports />}
      {tab === 'nalozi' && <Users />}
    </div>
  )
}
