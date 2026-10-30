import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { CITIES, CITY_GROUPS } from '../data/cities'

/** Poredi bez dijakritika: "cacak" nalazi "Čačak", "djurdjevo" nalazi "Đurđevo". */
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

interface Option {
  id: string
  label: string
}

interface Props {
  id?: string
  /** ime polja za FormData (skriveno polje sa izabranim gradom) */
  name?: string
  /** kontrolisana vrednost (id grada, ili '' za "svi gradovi"); bez nje komponenta sama pamti izbor */
  value?: string
  defaultValue?: string
  onChange?: (id: string) => void
  /** ako je zadato, prva opcija je "svi gradovi" sa ovim nazivom (za filtere) */
  allLabel?: string
  placeholder?: string
  ariaLabel?: string
  /** 'field' liči na ostala polja, 'bare' je bez ivice (za traku za pretragu) */
  variant?: 'field' | 'bare'
}

/**
 * Padajuća lista gradova sa pretragom: kucaš deo naziva i lista se sužava. Ista zatvorena lista kao i do sada
 * (grupisana kao u Temelju), samo što se ne mora listati kroz svih 161 mesta.
 * Radi i tastaturom (strelice, Enter, Esc) i sa čitačima ekrana.
 */
export default function CitySelect({
  id,
  name,
  value,
  defaultValue = '',
  onChange,
  allLabel,
  placeholder = 'Izaberi grad',
  ariaLabel,
  variant = 'field',
}: Props) {
  const autoId = useId()
  const inputId = id ?? autoId
  const listId = `${inputId}-lista`

  const [inner, setInner] = useState(defaultValue)
  const current = value ?? inner
  const selected = CITIES.find((c) => c.id === current)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const groups = useMemo(() => {
    const q = fold(query.trim())
    const out: { label: string; options: Option[] }[] = []

    if (allLabel && !q) out.push({ label: '', options: [{ id: '', label: allLabel }] })

    for (const g of CITY_GROUPS) {
      const matched = g.cities
        .filter((c) => !q || fold(c.name).includes(q))
        // prvo oni koji počinju upisanim, pa oni koji ga samo sadrže (redosled ostaje abecedni)
        .sort((a, b) => Number(fold(b.name).startsWith(q)) - Number(fold(a.name).startsWith(q)))
      if (matched.length) out.push({ label: g.label, options: matched.map((c) => ({ id: c.id, label: c.name })) })
    }
    return out
  }, [query, allLabel])

  const flat = useMemo(() => groups.flatMap((g) => g.options), [groups])

  // pri otvaranju kreni od izabranog grada, a pri kucanju od prvog rezultata
  useEffect(() => {
    if (open) setActive(Math.max(0, flat.findIndex((o) => o.id === current)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => setActive(0), [query])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function close() {
    setOpen(false)
    setQuery('')
  }

  function choose(optionId: string) {
    setInner(optionId)
    onChange?.(optionId)
    close()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return setOpen(true)
      setActive((a) => Math.max(0, Math.min(flat.length - 1, a + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if (e.key === 'Enter') {
      // Enter bira ponuđeni grad, a ne šalje formu
      if (open) {
        e.preventDefault()
        if (flat[active]) choose(flat[active].id)
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        close()
      }
    }
  }

  const closedText = selected?.name ?? (allLabel && current === '' ? allLabel : '')
  let index = -1

  const inputClass =
    variant === 'bare'
      ? 'min-h-12 w-full bg-transparent pr-7 text-[15px] font-medium text-sage-deep outline-none placeholder:text-ink/40'
      : 'field pr-11'

  return (
    <div
      ref={rootRef}
      className="relative w-full"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) close()
      }}
    >
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-activedescendant={open && flat[active] ? `${inputId}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        className={inputClass}
        value={open ? query : closedText}
        placeholder={open ? 'Ukucaj naziv grada…' : placeholder}
        onFocus={(e) => {
          setOpen(true)
          e.currentTarget.select()
        }}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      <ChevronDown
        className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-ink/45 transition ${
          variant === 'bare' ? 'right-0' : 'right-4'
        } ${open ? 'rotate-180' : ''}`}
        aria-hidden
      />
      {name && <input type="hidden" name={name} value={current} />}

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          // mousedown ne sme da skine fokus sa polja, inače se lista zatvori pre klika
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 min-w-56 overflow-auto rounded-2xl border border-sand bg-white p-1.5 shadow-lift"
        >
          {flat.length === 0 && (
            <li role="presentation" className="px-3 py-3 text-sm text-ink/55">
              Nema rezultata za „{query}“.
            </li>
          )}
          {groups.map((g) => (
            <li key={g.label || 'svi'} role="presentation">
              {g.label && (
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">{g.label}</p>
              )}
              <ul role="presentation">
                {g.options.map((o) => {
                  index += 1
                  const i = index
                  const isActive = i === active
                  return (
                    <li
                      key={o.id || 'svi'}
                      id={`${inputId}-opt-${i}`}
                      role="option"
                      aria-selected={o.id === current}
                      data-active={isActive}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(o.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-[14px] ${
                        isActive ? 'bg-sage/15 text-sage-deep' : 'text-ink/85'
                      } ${o.id === current ? 'font-bold' : ''}`}
                    >
                      {o.label}
                      {o.id === current && <Check className="size-4 text-sage-dark" aria-hidden />}
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
