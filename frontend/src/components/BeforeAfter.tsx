import { useState } from 'react'

interface Props {
  before?: string
  after: string
  alt: string
  className?: string
}

/**
 * Slike pre i posle: prevlačiš klizač i vidiš promenu. Ako nema slike "pre", prikazuje se samo "posle".
 * Klizač je običan input[type=range], pa radi i tastaturom i na dodir.
 */
export default function BeforeAfter({ before, after, alt, className = '' }: Props) {
  const [pos, setPos] = useState(50)

  if (!before) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img src={after} alt={alt} className="size-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`relative select-none overflow-hidden ${className}`}>
      <img src={after} alt={`${alt}: posle`} className="absolute inset-0 size-full object-cover" draggable={false} />
      <img
        src={before}
        alt={`${alt}: pre`}
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-sage-deep/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
        Pre
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-sage-dark px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
        Posle
      </span>

      <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.12)]" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-sage-deep shadow-lift">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Pomeri da uporediš pre i posle"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}
