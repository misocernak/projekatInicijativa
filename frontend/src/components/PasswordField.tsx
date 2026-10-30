import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  id: string
  name: string
  label: string
  autoComplete: 'current-password' | 'new-password'
  required?: boolean
  minLength?: number
  hint?: string
}

/** Polje za lozinku sa dugmetom "oko" koje prikazuje ili sakriva ukucani tekst. Vrednost se čita iz forme (FormData). */
export default function PasswordField({ id, name, label, autoComplete, required = true, minLength, hint }: Props) {
  const [shown, setShown] = useState(false)

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className="field pr-12"
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Sakrij lozinku' : 'Prikaži lozinku'}
          aria-pressed={shown}
          className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-ink/55 transition hover:bg-mist hover:text-sage-deep"
        >
          {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-ink/55">{hint}</p>}
    </div>
  )
}
