import { useState } from 'react'
import { adminTraffic, errorText, type AdminTraffic } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Empty, Spinner } from '../Bits'
import { DailyBars, HBars } from './Charts'

const RANGES = [
  { id: 7, label: '7 dana' },
  { id: 30, label: '30 dana' },
  { id: 90, label: '90 dana' },
  { id: 365, label: 'Godina' },
] as const

const PAGE_NAMES: Record<string, string> = {
  '/': 'Početna',
  '/inicijative': 'Sve akcije',
  '/realizovano': 'Realizovano',
  '/nova-inicijativa': 'Pokretanje akcije',
  '/o-projektu': 'O projektu',
  '/prijava': 'Prijava i registracija',
  '/profil': 'Moj profil',
  '/privatnost': 'Politika privatnosti',
  '/uslovi': 'Uslovi korišćenja',
}

const monthFmt = new Intl.DateTimeFormat('sr-Latn-RS', { month: 'short', year: '2-digit' })
const monthLabel = (m: string) => monthFmt.format(new Date(`${m}-15T12:00:00`))
const num = (n: number) => n.toLocaleString('sr-Latn-RS')

function pageName(p: AdminTraffic['pages'][number]) {
  if (PAGE_NAMES[p.path]) return PAGE_NAMES[p.path]
  if (p.path.startsWith('/inicijative/')) return p.title ?? 'Akcija (obrisana)'
  return p.path
}

function Tile({ label, views, visitors }: { label: string; views: number; visitors?: number }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/55">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold leading-none text-sage-deep">{num(views)}</p>
      <p className="mt-2 text-xs text-ink/60">
        {visitors === undefined ? 'pregleda stranica' : `pregleda, ${num(visitors)} posetilaca`}
      </p>
    </div>
  )
}

/** Mesečni stubići: pregledi po mesecima, uz broj posetilaca u opisu. */
function MonthlyBars({ data }: { data: AdminTraffic['monthly'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.views))
  const W = 600
  const H = 170
  const slot = W / data.length
  const barW = slot - 14
  const chartH = H - 8
  const active = hover !== null ? data[hover] : null

  return (
    <figure className="card p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold text-sage-deep">Pregledi po mesecima</span>
        <span className="text-xs text-ink/55">
          {active ? (
            <>
              {monthLabel(active.month)}: <strong className="text-sage-deep">{num(active.views)}</strong> pregleda,{' '}
              <strong className="text-sage-deep">{num(active.visitors)}</strong> posetilaca
            </>
          ) : (
            'prelazi mišem preko meseca'
          )}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="mt-3 w-full" role="img" aria-label="Pregledi stranica po mesecima, poslednjih 12 meseci" onMouseLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={H} y2={H} stroke="#ebe7de" />
        <line x1="0" x2={W} y1="8" y2="8" stroke="#ebe7de" strokeDasharray="3 4" />
        {data.map((d, i) => {
          const h = d.views === 0 ? 2 : Math.max(3, (d.views / max) * (chartH - 8))
          return (
            <g key={d.month} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
              <rect x={i * slot} y="0" width={slot} height={H + 18} fill="transparent" />
              <rect
                x={i * slot + (slot - barW) / 2}
                y={H - h}
                width={barW}
                height={h}
                rx="5"
                fill="#0b7a4b"
                opacity={d.views === 0 ? 0.18 : hover === null || hover === i ? 1 : 0.45}
              />
              <text x={i * slot + slot / 2} y={H + 14} textAnchor="middle" fontSize="11" fill="#6b756f">
                {monthLabel(d.month).split(' ')[0]}
              </text>
            </g>
          )
        })}
      </svg>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs font-semibold text-ink/55 hover:text-sage-deep">Tabela</summary>
        <table className="mt-2 w-full text-left text-xs text-ink/75">
          <thead>
            <tr>
              <th className="py-1 font-semibold">Mesec</th>
              <th className="py-1 text-right font-semibold">Pregledi</th>
              <th className="py-1 text-right font-semibold">Posetioci</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-t border-sand">
                <td className="py-1">{monthLabel(d.month)}</td>
                <td className="py-1 text-right">{num(d.views)}</td>
                <td className="py-1 text-right">{num(d.visitors)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export default function Traffic() {
  const [range, setRange] = useState<7 | 30 | 90 | 365>(30)
  const { data: t, loading, error } = useAsync(() => adminTraffic(range), [range])

  if (loading && !t) return <Spinner />
  if (error || !t) return <Empty title="Učitavanje nije uspelo" text={error ? errorText(error) : undefined} />

  const daily = t.daily.slice(-90)
  const deviceTotal = t.devices.mobile + t.devices.desktop

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Danas" views={t.totals.today.views} visitors={t.totals.today.visitors} />
        <Tile label="Poslednjih 7 dana" views={t.totals.last7.views} visitors={t.totals.last7.visitors} />
        <Tile label="Poslednjih 30 dana" views={t.totals.last30.views} visitors={t.totals.last30.visitors} />
        <div className="card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/55">Ukupno</p>
          <p className="mt-2 font-display text-4xl font-extrabold leading-none text-sage-deep">{num(t.totals.allTime.views)}</p>
          <p className="mt-2 text-xs text-ink/60">
            {t.totals.allTime.since ? `pregleda od ${new Date(`${t.totals.allTime.since}T12:00:00`).toLocaleDateString('sr-Latn-RS')}` : 'još nema podataka'}
          </p>
        </div>
      </div>

      <p className="text-xs text-ink/55">
        Brojanje je bez kolačića i bez čuvanja IP adrese, botovi i admini se ne broje. „Posetioci“ su različiti ljudi po danu: ko dođe dva dana, računa se dva puta.
      </p>

      <DailyBars title={`Pregledi po danima (poslednjih ${Math.min(range, 90)})`} data={daily.slice(-Math.min(range, 90)).map((d) => ({ date: d.date, count: d.views }))} />
      <MonthlyBars data={t.monthly} />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Period za strane i izvore">
        <span className="mr-1 text-[13px] font-semibold text-ink/65">Strane i izvori za:</span>
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            aria-pressed={range === r.id}
            className={`min-h-9 rounded-full border px-4 text-[13px] font-semibold transition ${
              range === r.id ? 'border-sage-dark bg-sage-dark text-white' : 'border-sand bg-white text-ink/70 hover:border-sage-dark/40'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <section className="card overflow-x-auto p-5" aria-label="Najposećenije strane">
        <h3 className="text-[13px] font-bold text-sage-deep [font-family:var(--font-sans)] tracking-normal">Najposećenije strane</h3>
        {t.pages.length === 0 ? (
          <p className="mt-3 text-sm text-ink/55">Nema poseta u ovom periodu.</p>
        ) : (
          <table className="mt-3 w-full min-w-[28rem] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-ink/50">
              <tr>
                <th className="py-1.5 font-semibold">Strana</th>
                <th className="py-1.5 text-right font-semibold">Pregledi</th>
                <th className="py-1.5 text-right font-semibold">Posetioci</th>
              </tr>
            </thead>
            <tbody>
              {t.pages.map((p) => (
                <tr key={p.path} className="border-t border-sand">
                  <td className="py-2 pr-3">
                    <span className="font-semibold text-sage-deep">{pageName(p)}</span>
                    <span className="ml-2 text-xs text-ink/45">{p.path.startsWith('/inicijative/') ? '' : p.path}</span>
                  </td>
                  <td className="py-2 text-right font-bold text-sage-deep">{num(p.views)}</td>
                  <td className="py-2 text-right text-ink/70">{num(p.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <HBars title="Odakle dolaze (izvor)" rows={t.sources.map((s) => ({ label: s.name, value: s.views }))} empty="Nema podataka u ovom periodu." />
        <HBars
          title="Uređaji"
          rows={[
            { label: `Telefon${deviceTotal ? ` (${Math.round((t.devices.mobile / deviceTotal) * 100)}%)` : ''}`, value: t.devices.mobile },
            { label: `Računar${deviceTotal ? ` (${Math.round((t.devices.desktop / deviceTotal) * 100)}%)` : ''}`, value: t.devices.desktop },
          ]}
        />
      </div>
      <p className="text-xs text-ink/55">
        Savet za marketing: u linkove koje deliš dodaj <code>?utm_source=facebook</code> (ili <code>instagram</code>, <code>viber</code>), pa će se u „Odakle dolaze“ videti koja objava je donela posete.
      </p>
    </div>
  )
}
