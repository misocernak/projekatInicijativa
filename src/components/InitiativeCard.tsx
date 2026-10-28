import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { participantCount } from '../api'
import { categoryLabel, cityName } from '../data/constants'
import { formatWhen, getStatus } from '../lib/dates'
import type { Initiative } from '../types'
import { CATEGORY_ICON, StatusBadge } from './Bits'

export default function InitiativeCard({ item }: { item: Initiative }) {
  const Icon = CATEGORY_ICON[item.category]
  const status = getStatus(item)
  const count = participantCount(item)
  const pct = item.capacity ? Math.min(100, (count / item.capacity) * 100) : 0

  return (
    <Link
      to={`/inicijative/${item.id}`}
      className="card group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-sage/35 via-sage/20 to-sand px-6 pb-7 pt-5">
        <Icon
          className="pointer-events-none absolute -bottom-6 -right-4 size-32 text-sage-dark/10 transition duration-500 group-hover:scale-110 group-hover:-rotate-6"
          strokeWidth={1}
          aria-hidden
        />
        <div className="relative flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage-deep/80">
            {categoryLabel(item.category)}
          </span>
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h3 className="text-[27px] leading-[1.1] text-sage-deep">{item.title}</h3>
        <ul className="mt-auto space-y-2 text-[13px] text-ink/70">
          <li className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-sage-dark" aria-hidden />
            {cityName(item.cityId)}, {item.address}
          </li>
          <li className="flex items-start gap-2.5">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-sage-dark" aria-hidden />
            {formatWhen(item)}
          </li>
          <li className="flex items-start gap-2.5">
            <Users className="mt-0.5 size-4 shrink-0 text-sage-dark" aria-hidden />
            {count} {count === 1 ? 'prijavljen' : 'prijavljenih'}
            {item.capacity ? ` od ${item.capacity}` : ''}
          </li>
        </ul>
        {item.capacity ? (
          <div className="h-1 overflow-hidden rounded-full bg-mist" aria-hidden>
            <div className="h-full rounded-full bg-sage" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
    </Link>
  )
}
