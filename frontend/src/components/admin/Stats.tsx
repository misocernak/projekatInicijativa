import { Link } from 'react-router-dom'
import { adminStats, errorText } from '../../api'
import { STATUS_LABEL, categoryLabel } from '../../data/constants'
import { useAsync } from '../../lib/useAsync'
import type { CategoryId } from '../../types'
import { CATEGORY_STYLE, Empty, Spinner } from '../Bits'
import { DailyBars, HBars } from './Charts'

function Tile({ label, value, note, tone }: { label: string; value: number; note?: string; tone?: 'alert' }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/55">{label}</p>
      <p className={`mt-2 font-display text-4xl font-extrabold leading-none ${tone === 'alert' ? 'text-clay' : 'text-sage-deep'}`}>{value}</p>
      {note && <p className="mt-2 text-xs text-ink/60">{note}</p>}
    </div>
  )
}

export default function Stats() {
  const { data: s, loading, error, reload } = useAsync(adminStats, [])

  if (loading) return <Spinner />
  if (error || !s) return <Empty title="Učitavanje nije uspelo" text={error ? errorText(error) : undefined} />

  const active = s.initiatives.byStatus.upcoming + s.initiatives.byStatus.ongoing + s.initiatives.byStatus.permanent

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Nalozi" value={s.users.total} note={`+${s.users.new7} u poslednjih 7 dana`} />
        <Tile label="Akcije" value={s.initiatives.total} note={`${active} aktivnih, +${s.initiatives.new7} u 7 dana`} />
        <Tile
          label="Volonteri"
          value={s.participations.volunteers}
          note={`${s.participations.confirmed} potvrđenih prijava, ${s.participations.pending} čeka mejl`}
        />
        <Link to="/admin?tab=prijave" className="block">
          <Tile
            label="Prijave sadržaja"
            value={s.reports.open}
            tone={s.reports.open > 0 ? 'alert' : undefined}
            note={s.reports.open > 0 ? 'čekaju pregled' : `nema otvorenih (${s.reports.resolved} rešenih)`}
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DailyBars title="Novi nalozi" data={s.series.users} />
        <DailyBars title="Nove akcije" data={s.series.initiatives} />
        <DailyBars title="Potvrđene prijave volontera" data={s.series.participations} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HBars
          title="Akcije po statusu"
          rows={(['upcoming', 'ongoing', 'permanent', 'finished', 'cancelled'] as const)
            .map((k) => ({ label: STATUS_LABEL[k], value: s.initiatives.byStatus[k] }))
            .concat([{ label: 'Sakrivene (moderacija)', value: s.initiatives.byStatus.hidden }])}
        />
        <HBars
          title="Nalozi"
          rows={[
            { label: 'Potvrđeni', value: s.users.verified },
            { label: 'Čekaju potvrdu mejla', value: s.users.unverified },
            { label: 'Brza prijava (bez lozinke)', value: s.users.quick },
            { label: 'Admini', value: s.users.admins },
          ]}
        />
        <HBars
          title="Akcije po vrsti"
          rows={s.initiatives.byCategory.map((c) => ({
            label: categoryLabel(c.slug as CategoryId),
            value: c.count,
            color: CATEGORY_STYLE[c.slug as CategoryId]?.fg,
          }))}
          empty="Još nema akcija."
        />
        <HBars title="Gradovi sa najviše akcija" rows={s.initiatives.byCity.map((c) => ({ label: c.name, value: c.count }))} empty="Još nema akcija." />
      </div>

      <p className="text-xs text-ink/50">
        Stanje na {new Date(s.generatedAt).toLocaleString('sr-Latn-RS')}.{' '}
        <button onClick={reload} className="font-semibold text-sage-dark underline">
          Osveži
        </button>
      </p>
    </div>
  )
}
