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
  upcoming: 'bg-white/80 text-sage-deep ring-1 ring-sage/40',
  ongoing: 'bg-sage-dark text-cream',
  finished: 'bg-mist text-ink/60',
  permanent: 'bg-sand text-sage-deep ring-1 ring-sage-dark/20',
  cancelled: 'bg-clay/15 text-clay',
}

export function StatusBadge({ status }: { status: InitiativeStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Spinner({ label = 'Učitavanje…' }: { label?: string }) {
  return (
    <p role="status" className="py-20 text-center font-display text-xl text-sage-deep/60">
      {label}
    </p>
  )
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-sage/50 bg-white/50 px-6 py-14 text-center">
      <p className="font-display text-3xl text-sage-deep">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-ink/65">{text}</p>}
    </div>
  )
}

export function PageHead({ eyebrow, title, text }: { eyebrow: string; title: React.ReactNode; text?: string }) {
  return (
    <header className="rise mb-10">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="text-5xl text-sage-deep sm:text-6xl">{title}</h1>
      {text && <p className="mt-4 max-w-2xl text-lg text-ink/70">{text}</p>}
    </header>
  )
}
