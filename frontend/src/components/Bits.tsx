import {
  Brush,
  Dog,
  HandHeart,
  Infinity as InfinityIcon,
  Leaf,
  Palette,
  Shapes,
  Sprout,
  type LucideIcon,
} from 'lucide-react'
import { STATUS_LABEL } from '../data/constants'
import type { CategoryId, Initiative, InitiativeStatus } from '../types'

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  ciscenje: Leaf,
  zelenilo: Sprout,
  uredjenje: Brush,
  igraliste: Shapes,
  pomoc: HandHeart,
  zivotinje: Dog,
  kultura: Palette,
}

/** bg: pastelna podloga, fg: tamnija nijansa iste boje za oblike i ikone */
export const CATEGORY_STYLE: Record<CategoryId, { bg: string; fg: string }> = {
  ciscenje: { bg: '#cfe8f7', fg: '#1b6a99' },
  zelenilo: { bg: '#cdebd3', fg: '#1e7a45' },
  uredjenje: { bg: '#fde7a9', fg: '#8a6100' },
  igraliste: { bg: '#e2efb6', fg: '#5c7a12' },
  pomoc: { bg: '#e0d6f7', fg: '#5b3fb0' },
  zivotinje: { bg: '#fbdac3', fg: '#b4531a' },
  kultura: { bg: '#bfeae6', fg: '#0f6b66' },
}

const STATUS_STYLE: Record<InitiativeStatus, string> = {
  upcoming: 'bg-white text-sage-deep',
  ongoing: 'bg-sage-dark text-white',
  finished: 'bg-sage-deep/80 text-white',
  permanent: 'bg-sun text-sage-deep',
  cancelled: 'bg-clay text-white',
}

export function StatusBadge({ status }: { status: InitiativeStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] shadow-sm ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

/** Ilustrovan "plakat" kategorije: pastelna podloga, talasi, krugovi i ikona. */
export function Art({
  category,
  image,
  className = '',
  children,
}: {
  category: CategoryId
  image?: string
  className?: string
  children?: React.ReactNode
}) {
  const s = CATEGORY_STYLE[category]
  const Icon = CATEGORY_ICON[category]
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: s.bg }}>
      {image ? (
        <>
          <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/20" />
        </>
      ) : (
      <>
      <svg
        viewBox="0 0 400 260"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <circle cx="340" cy="30" r="130" fill={s.fg} opacity=".12" />
        <circle cx="40" cy="250" r="100" fill={s.fg} opacity=".1" />
        <circle cx="250" cy="120" r="34" fill="#fff" opacity=".5" />
        <circle cx="90" cy="70" r="14" fill="#fff" opacity=".6" />
        <path d="M0 200 Q100 150 210 200 T400 180 V260 H0Z" fill={s.fg} opacity=".16" />
        <path d="M0 230 Q120 195 230 232 T400 215 V260 H0Z" fill={s.fg} opacity=".14" />
      </svg>
      <Icon
        className="absolute -right-3 top-1/2 size-40 -translate-y-1/2 opacity-[0.13]"
        style={{ color: s.fg }}
        strokeWidth={1.2}
        aria-hidden
      />
      </>
      )}
      <span
        className="absolute bottom-4 right-4 grid size-14 place-items-center rounded-full bg-white shadow-[0_8px_18px_-8px_rgb(0_0_0/0.35)]"
        style={{ color: s.fg }}
      >
        <Icon className="size-7" strokeWidth={1.8} aria-hidden />
      </span>
      {children}
    </div>
  )
}

const monthFmt = new Intl.DateTimeFormat('sr-Latn-RS', { month: 'short' })

export function DateChip({ item }: { item: Initiative }) {
  if (item.kind === 'permanent' || !item.startDate) {
    return (
      <div className="grid min-w-14 place-items-center rounded-2xl bg-white px-3 py-2 text-sage-deep shadow-sm">
        <InfinityIcon className="size-5" aria-hidden />
        <span className="text-[9px] font-bold uppercase tracking-[0.12em]">Stalno</span>
      </div>
    )
  }
  const d = new Date(item.startDate)
  return (
    <div className="grid min-w-14 place-items-center rounded-2xl bg-white px-3 py-1.5 leading-none shadow-sm">
      <span className="font-display text-2xl font-extrabold text-sage-deep">{d.getDate()}</span>
      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sage-dark">
        {monthFmt.format(d).replace('.', '')}
      </span>
    </div>
  )
}

const AVATAR_COLORS = ['#ff7a59', '#0b7a4b', '#ffd25e', '#5b3fb0', '#1b6a99', '#5c7a12']
const AVATAR_LETTERS = ['A', 'M', 'J', 'S', 'N', 'D', 'K', 'L']

export function AvatarStack({ count, size = 'sm' }: { count: number; size?: 'sm' | 'md' }) {
  const shown = Math.min(4, count)
  const dim = size === 'md' ? 'size-10 text-xs' : 'size-8 text-[11px]'
  return (
    <div className="flex items-center" aria-hidden>
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className={`${dim} -ml-2 grid place-items-center rounded-full border-2 border-white font-bold first:ml-0 ${
            AVATAR_COLORS[i % 6] === '#ffd25e' ? 'text-sage-deep' : 'text-white'
          }`}
          style={{ background: AVATAR_COLORS[i % 6] }}
        >
          {AVATAR_LETTERS[(i + count) % 8]}
        </span>
      ))}
      {count > shown && (
        <span className={`${dim} -ml-2 grid place-items-center rounded-full border-2 border-white bg-mist font-bold text-sage-deep`}>
          +{count - shown > 99 ? '99' : count - shown}
        </span>
      )}
    </div>
  )
}

export function Spinner({ label = 'Učitavanje…' }: { label?: string }) {
  return (
    <p role="status" className="py-20 text-center font-display text-xl font-semibold text-sage-deep/50">
      {label}
    </p>
  )
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-sand bg-white px-6 py-14 text-center">
      <p className="font-display text-2xl font-extrabold text-sage-deep">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-ink/65">{text}</p>}
    </div>
  )
}

export function PageHead({ eyebrow, title, text }: { eyebrow: string; title: React.ReactNode; text?: string }) {
  return (
    <header className="rise mb-10">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      {text && <p className="mt-4 max-w-2xl text-lg text-ink/70">{text}</p>}
    </header>
  )
}
