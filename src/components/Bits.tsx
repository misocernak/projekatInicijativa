import {
  Brush,
  Dog,
  HandHeart,
  Leaf,
  Palette,
  Shapes,
  Sprout,
  type LucideIcon,
} from 'lucide-react'
import { STATUS_LABEL } from '../data/constants'
import type { CategoryId, InitiativeStatus } from '../types'

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  ciscenje: Leaf,
  zelenilo: Sprout,
  uredjenje: Brush,
  igraliste: Shapes,
  pomoc: HandHeart,
  zivotinje: Dog,
  kultura: Palette,
}

const STATUS_STYLE: Record<InitiativeStatus, string> = {
  upcoming: 'bg-sage/25 text-sage-deep',
  ongoing: 'bg-sage-dark text-cream',
  finished: 'bg-mist text-ink/70',
  permanent: 'bg-sand text-sage-deep',
  cancelled: 'bg-clay/15 text-clay',
}

export function StatusBadge({ status }: { status: InitiativeStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Spinner({ label = 'Učitavanje…' }: { label?: string }) {
  return (
    <p role="status" className="py-16 text-center text-sage-deep/70">
      {label}
    </p>
  )
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-sage/50 bg-white/50 px-6 py-12 text-center">
      <p className="font-display text-xl text-sage-deep">{title}</p>
      {text && <p className="mt-1 text-ink/70">{text}</p>}
    </div>
  )
}
