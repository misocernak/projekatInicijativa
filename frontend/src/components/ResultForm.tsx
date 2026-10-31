import { useState, type FormEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { errorText, publishResult } from '../api'
import { resizeImage } from '../lib/image'
import type { Initiative } from '../types'

interface Props {
  item: Initiative
  onDone: (updated: Initiative) => void
  onCancel: () => void
}

function Picker({
  label,
  hint,
  shown,
  onPick,
  onClear,
}: {
  label: string
  hint: string
  shown?: string
  onPick: (file: File) => void
  onClear?: () => void
}) {
  return (
    <div>
      <span className="label">{label}</span>
      {shown ? (
        <div className="relative overflow-hidden rounded-2xl">
          <img src={shown} alt="" className="h-40 w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-2">
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-semibold text-sage-deep shadow-md">
              <ImagePlus className="size-4" aria-hidden /> Zameni
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
            </label>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 text-[12px] font-semibold text-sage-deep shadow-md"
              >
                <X className="size-4" aria-hidden /> Ukloni
              </button>
            )}
          </div>
        </div>
      ) : (
        <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-sand bg-mist/60 px-4 text-center transition hover:border-sage-dark/50 hover:bg-white">
          <ImagePlus className="size-7 text-sage-dark" aria-hidden />
          <span className="text-[13px] font-semibold text-sage-deep">Dodaj sliku</span>
          <span className="text-xs text-ink/55">{hint}</span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
        </label>
      )}
    </div>
  )
}

/** Organizator objavljuje (ili menja) rezultat završene akcije: šta je urađeno + slika pre i posle. */
export default function ResultForm({ item, onDone, onCancel }: Props) {
  const [text, setText] = useState(item.result?.text ?? '')
  const [before, setBefore] = useState<{ blob?: Blob; url?: string; removed: boolean }>({ url: item.result?.before, removed: false })
  const [after, setAfter] = useState<{ blob?: Blob; url?: string }>({ url: item.result?.after })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(file: File, set: (v: { blob: Blob; url: string; removed: boolean }) => void) {
    if (!file.type.startsWith('image/')) return setError('Izaberi sliku (JPG, PNG ili WebP).')
    setError('')
    try {
      const blob = await resizeImage(file)
      set({ blob, url: URL.createObjectURL(blob), removed: false })
    } catch {
      setError('Slika se ne može učitati. Probaj drugu.')
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!after.url) return setError('Dodaj sliku kako je ispalo na kraju.')
    setBusy(true)
    setError('')
    try {
      const updated = await publishResult(item.id, {
        text: text.trim(),
        before: before.blob,
        after: after.blob,
        removeBefore: before.removed,
      })
      onDone(updated)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6 sm:p-7">
      <div>
        <h2 className="text-2xl text-sage-deep">{item.result ? 'Izmeni rezultat' : 'Pokaži šta ste uradili'}</h2>
        <p className="mt-1.5 text-[14px] text-ink/65">
          Rezultat se objavljuje na strani „Uradili smo“, da i drugi vide šta je moguće kad se komšije okupe.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Picker
          label="Pre (opciono)"
          hint="Kako je izgledalo na početku"
          shown={before.removed ? undefined : before.url}
          onPick={(f) => pick(f, (v) => setBefore(v))}
          onClear={() => setBefore({ removed: true })}
        />
        <Picker label="Posle" hint="Kako je ispalo na kraju" shown={after.url} onPick={(f) => pick(f, (v) => setAfter({ blob: v.blob, url: v.url }))} />
      </div>

      <div>
        <label className="label" htmlFor="result-text">
          Šta je urađeno
        </label>
        <textarea
          id="result-text"
          required
          minLength={20}
          maxLength={3000}
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="field py-3"
          placeholder="Npr. Očistili smo park kod škole: izneli smo 30 džakova smeća, okrečili klupe i posadili 12 sadnica."
        />
        <p className="mt-1.5 text-xs text-ink/55">Brojke i konkretni detalji najbolje deluju: koliko džakova, sadnica, klupa, sati.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="btn-primary">
          {busy ? 'Objavljujem…' : item.result ? 'Sačuvaj izmene' : 'Objavi rezultat'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Odustani
        </button>
      </div>
    </form>
  )
}
