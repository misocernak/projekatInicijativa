import { useState } from 'react'
import type { DayPoint } from '../../api'

const dayFmt = new Intl.DateTimeFormat('sr-Latn-RS', { day: 'numeric', month: 'short' })
const fmtDay = (iso: string) => dayFmt.format(new Date(iso + 'T12:00:00'))

/**
 * Stubićasti grafikon po danima (jedna serija, jedna osa).
 * Tanki stubići sa zaobljenim vrhom, najava vrednosti pri prelasku mišem ili fokusu, i tabela za čitače ekrana.
 */
export function DailyBars({ title, data, color = '#0b7a4b' }: { title: string; data: DayPoint[]; color?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((s, d) => s + d.count, 0)

  const W = 600
  const H = 130
  const top = 6
  const bottom = 2
  const slot = W / data.length
  const barW = Math.max(4, slot - 6)
  const chartH = H - top - bottom
  const active = hover !== null ? data[hover] : null

  return (
    <figure className="card p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold text-sage-deep">{title}</span>
        <span className="text-xs text-ink/55">
          {active ? (
            <>
              {fmtDay(active.date)}: <strong className="text-sage-deep">{active.count}</strong>
            </>
          ) : (
            <>
              ukupno <strong className="text-sage-deep">{total}</strong>
            </>
          )}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`${title}: ukupno ${total} u poslednjih 30 dana, najviše ${max} u jednom danu`}
        onMouseLeave={() => setHover(null)}
      >
        <line x1="0" x2={W} y1={top + chartH} y2={top + chartH} stroke="#ebe7de" strokeWidth="1" />
        <line x1="0" x2={W} y1={top} y2={top} stroke="#ebe7de" strokeWidth="1" strokeDasharray="3 4" />
        {data.map((d, i) => {
          const h = d.count === 0 ? 2 : Math.max(3, (d.count / max) * chartH)
          const x = i * slot + (slot - barW) / 2
          const y = top + chartH - h
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
              {/* veća površina za hover nego što je sam stubić */}
              <rect x={i * slot} y={top} width={slot} height={chartH + bottom} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={Math.min(4, barW / 2)}
                fill={color}
                opacity={d.count === 0 ? 0.18 : hover === null || hover === i ? 1 : 0.45}
              />
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-ink/50" aria-hidden>
        <span>{fmtDay(data[0].date)}</span>
        <span>najviše {total === 0 ? 0 : max} dnevno</span>
        <span>danas</span>
      </div>

      <details className="mt-1">
        <summary className="cursor-pointer text-xs font-semibold text-ink/55 hover:text-sage-deep">Tabela</summary>
        <table className="mt-2 w-full text-left text-xs text-ink/75">
          <thead>
            <tr>
              <th className="py-1 font-semibold">Dan</th>
              <th className="py-1 text-right font-semibold">Broj</th>
            </tr>
          </thead>
          <tbody>
            {data
              .filter((d) => d.count > 0)
              .map((d) => (
                <tr key={d.date} className="border-t border-sand">
                  <td className="py-1">{fmtDay(d.date)}</td>
                  <td className="py-1 text-right">{d.count}</td>
                </tr>
              ))}
            {total === 0 && (
              <tr>
                <td colSpan={2} className="py-1 text-ink/50">
                  Nema podataka u ovom periodu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export interface BarRow {
  label: string
  value: number
  /** boja stubića; podrazumevano primarna */
  color?: string
}

/** Vodoravni stubići za raspodelu po kategorijama (sortirano, jedna osa, vrednost uz svaki red). */
export function HBars({ title, rows, empty = 'Nema podataka.' }: { title: string; rows: BarRow[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))

  return (
    <section className="card p-5" aria-label={title}>
      <h3 className="text-[13px] font-bold text-sage-deep [font-family:var(--font-sans)] tracking-normal">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink/55">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-[13px]">
              <span className="truncate text-ink/80" title={r.label}>
                {r.label}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-mist" aria-hidden>
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color ?? '#0b7a4b' }}
                />
              </span>
              <span className="text-right font-bold text-sage-deep">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
