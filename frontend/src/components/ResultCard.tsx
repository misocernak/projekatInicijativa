import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin, Users } from 'lucide-react'
import { categoryLabel, cityName } from '../data/constants'
import { formatDate } from '../lib/dates'
import type { Initiative } from '../types'
import { CATEGORY_STYLE } from './Bits'

/** Kartica na strani "Uradili smo": slika pre/posle, šta je urađeno, ko i koliko ih je bilo. */
export default function ResultCard({ item }: { item: Initiative }) {
  const result = item.result
  if (!result?.after) return null
  const fg = CATEGORY_STYLE[item.category].fg

  return (
    <Link
      to={`/inicijative/${item.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-sand bg-white shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-lift"
    >
      <div className="relative grid aspect-[16/10] shrink-0 gap-0.5 bg-white" style={{ gridTemplateColumns: result.before ? '1fr 1fr' : '1fr' }}>
        {result.before && (
          <div className="relative overflow-hidden">
            <img src={result.before} alt="" className="size-full object-cover" loading="lazy" />
            <span className="absolute bottom-3 left-3 rounded-full bg-sage-deep/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              Pre
            </span>
          </div>
        )}
        <div className="relative overflow-hidden">
          <img src={result.after} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          <span className="absolute bottom-3 right-3 rounded-full bg-sage-dark px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
            Posle
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: fg }}>
          {categoryLabel(item.category)}
        </span>
        <h3 className="mt-2 text-[22px] leading-[1.15]">{item.title}</h3>
        <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink/75">{result.text}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-6">
          <div className="space-y-1.5 text-[12px] text-ink/65">
            <p className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" style={{ color: fg }} aria-hidden />
              {cityName(item.cityId)}
              {item.endDate ? `, ${formatDate(item.endDate)}` : ''}
            </p>
            <p className="flex items-center gap-1.5 font-semibold text-sage-deep">
              <Users className="size-4 shrink-0" style={{ color: fg }} aria-hidden />
              {item.participants} {item.participants === 1 ? 'volonter' : 'volontera'}
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage-deep text-white transition group-hover:bg-sage-dark">
            <ArrowUpRight className="size-5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}
