import type { ResultsPage } from '../api'

/** Tri velike brojke: koliko je akcija završeno, koliko volontera je učestvovalo i u koliko gradova. */
export default function ResultStats({ stats, dark = false }: { stats: ResultsPage['stats']; dark?: boolean }) {
  const items = [
    { n: stats.actions, label: stats.actions === 1 ? 'završena akcija' : 'završenih akcija' },
    { n: stats.volunteers, label: stats.volunteers === 1 ? 'volonter' : 'volontera' },
    { n: stats.cities, label: stats.cities === 1 ? 'grad' : 'gradova' },
  ]
  return (
    <dl className="grid grid-cols-3 gap-3 sm:gap-6">
      {items.map((i) => (
        <div
          key={i.label}
          className={`rounded-3xl px-4 py-6 text-center sm:py-8 ${dark ? 'bg-white/10 text-white' : 'border border-sand bg-white shadow-soft'}`}
        >
          <div className="flex flex-col-reverse">
            <dt className={`mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] sm:text-[13px] ${dark ? 'text-white/80' : 'text-ink/60'}`}>
              {i.label}
            </dt>
            <dd className={`font-display text-4xl font-extrabold leading-none sm:text-6xl ${dark ? 'text-white' : 'text-sage-dark'}`}>
              {i.n.toLocaleString('sr-Latn-RS')}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}
