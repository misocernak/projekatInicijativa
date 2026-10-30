import { useMemo } from 'react'

interface Props {
  idPrefix: string
  label: string
  /** lokalna vrednost u obliku "YYYY-MM-DDTHH:mm" */
  value: string
  onChange: (value: string) => void
  min?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Vremena na svakih 15 minuta; ako je postojeće vreme van mreže, dodaje se u listu. */
function timeOptions(current: string) {
  const out: string[] = []
  for (let h = 0; h < 24; h++) for (const m of [0, 15, 30, 45]) out.push(`${pad(h)}:${pad(m)}`)
  if (current && !out.includes(current)) out.push(current)
  return out.sort()
}

/**
 * Datum i vreme u dva odvojena, ista visoka polja: datum (kalendar) + vreme (lista na 15 minuta).
 * Zamenjuje <input type="datetime-local">, koji na računaru deluje nezgrapno, a na telefonima iskače iz okvira.
 */
export default function DateTimeField({ idPrefix, label, value, onChange, min }: Props) {
  const [date = '', time = ''] = value.split('T')
  const options = useMemo(() => timeOptions(time), [time])

  return (
    <fieldset className="min-w-0">
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,7.5rem)] gap-2">
        <input
          id={`${idPrefix}-datum`}
          type="date"
          required
          aria-label={`${label}: datum`}
          value={date}
          min={min?.slice(0, 10)}
          onChange={(e) => onChange(`${e.target.value}T${time || '10:00'}`)}
          className="field"
        />
        <select
          id={`${idPrefix}-vreme`}
          aria-label={`${label}: vreme`}
          value={time}
          onChange={(e) => onChange(`${date}T${e.target.value}`)}
          className="field"
        >
          {options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  )
}
