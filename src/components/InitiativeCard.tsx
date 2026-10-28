import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { participantCount } from '../api'
import { categoryLabel, cityName } from '../data/constants'
import { getStatus } from '../lib/dates'
import type { Initiative } from '../types'
import { Art, AvatarStack, CATEGORY_STYLE, DateChip, StatusBadge } from './Bits'

export default function InitiativeCard({ item }: { item: Initiative }) {
  const status = getStatus(item)
  const count = participantCount(item)
  const fg = CATEGORY_STYLE[item.category].fg

  return (
    <Link
      to={`/inicijative/${item.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-sand bg-white shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-lift"
    >
      <Art category={item.category} className="aspect-[16/10] shrink-0">
        <div className="absolute inset-x-4 top-4 flex items-start justify-between">
          <DateChip item={item} />
          <StatusBadge status={status} />
        </div>
      </Art>
      <div className="flex flex-1 flex-col p-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: fg }}>
          {categoryLabel(item.category)}
        </span>
        <h3 className="mt-2 text-[28px] leading-[1.06]">{item.title}</h3>
        <p className="mt-3 flex items-start gap-1.5 text-[13px] text-ink/65">
          <MapPin className="mt-0.5 size-4 shrink-0" style={{ color: fg }} aria-hidden />
          {cityName(item.cityId)}, {item.address}
        </p>
        <div className="mt-auto flex items-center justify-between pt-6">
          <div className="flex items-center gap-3">
            <AvatarStack count={count} />
            <span className="text-[12px] font-semibold text-sage-deep">
              {count}
              {item.capacity ? `/${item.capacity}` : ''}
              <span className="font-medium text-ink/55"> volontera</span>
            </span>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-sage-deep text-white transition group-hover:bg-sage-dark">
            <ArrowUpRight className="size-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}
