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

  return (
    <Link
      to={`/inicijative/${item.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-sand bg-white transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between bg-sage/20 px-5 py-4">
        <span className="flex items-center gap-2 text-sm font-bold text-sage-deep">
          <Icon className="size-5" aria-hidden />
          {categoryLabel(item.category)}
        </span>
        <StatusBadge status={status} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-xl leading-snug text-sage-deep group-hover:underline">{item.title}</h3>
        <ul className="mt-auto space-y-1.5 text-sm text-ink/75">
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            {cityName(item.cityId)}, {item.address}
          </li>
          <li className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
            {formatWhen(item)}
          </li>
          <li className="flex items-start gap-2">
            <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
            {count} {count === 1 ? 'prijavljen' : 'prijavljenih'}
            {item.capacity ? ` od ${item.capacity}` : ''}
          </li>
        </ul>
      </div>
    </Link>
  )
}
