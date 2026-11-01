import { useEffect, useRef, useState } from 'react'
import { Check, Download, Link2, Share2, X } from 'lucide-react'
import { renderStory } from '../lib/storyImage'
import type { Initiative } from '../types'

interface Props {
  item: Initiative
  url: string
  /** da li je link već kopiran u trenutku klika (kopiranje mora iz klika, pa ga radi dugme) */
  initialCopied: boolean
  onClose: () => void
}

/**
 * Pregled story slike + deljenje. Link akcije se kopira čim se dijalog otvori (klik korisnika),
 * a slika se šalje preko sistemskog menija za deljenje (na telefonu tu stoji Instagram), ili se preuzima.
 * Slika se pravi unapred, pa deljenje ide direktno iz klika (pregledači to traže).
 */
export default function StoryShareDialog({ item, url, initialCopied, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [blob, setBlob] = useState<Blob>()
  const [preview, setPreview] = useState<string>()
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<boolean>(initialCopied)
  const [missingPhoto, setMissingPhoto] = useState(false)

  const file = blob ? new File([blob], `story-${item.id}.png`, { type: 'image/png' }) : undefined
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  useEffect(() => {
    ref.current?.showModal()

    let revoke: string | undefined
    let alive = true
    renderStory(item)
      .then(({ blob: b, photo }) => {
        if (!alive) return
        revoke = URL.createObjectURL(b)
        setMissingPhoto(!photo && !!(item.image ?? item.result?.after))
        setBlob(b)
        setPreview(revoke)
      })
      .catch(() => alive && setError('Sliku nije moguće napraviti. Probaj ponovo.'))

    return () => {
      alive = false
      if (revoke) URL.revokeObjectURL(revoke)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function share() {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: item.title })
    } catch {
      /* korisnik je zatvorio meni za deljenje */
    }
  }

  function download() {
    if (!preview) return
    const a = document.createElement('a')
    a.href = preview
    a.download = `lepsasrbija-story-${item.id}.png`
    a.click()
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[min(94vw,26rem)] max-h-[94vh] overflow-y-auto rounded-[2rem] border border-sand bg-white p-0 shadow-lift backdrop:bg-sage-deep/60"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl text-sage-deep">Podeli na Instagram story</h2>
          <button onClick={() => ref.current?.close()} aria-label="Zatvori" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-mist">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="mx-auto mt-4 aspect-[9/16] w-48 overflow-hidden rounded-2xl border border-sand bg-mist sm:w-56">
          {preview ? (
            <img src={preview} alt="Pregled story slike" className="size-full object-cover" />
          ) : error ? (
            <p className="grid size-full place-items-center p-4 text-center text-sm text-clay">{error}</p>
          ) : (
            <p className="grid size-full place-items-center p-4 text-center text-sm text-ink/55">Pravim sliku…</p>
          )}
        </div>

        {missingPhoto && (
          <p className="mt-3 rounded-xl bg-clay/10 px-3.5 py-2.5 text-[13px] font-semibold text-clay">
            Fotografija akcije nije mogla da se učita, pa je na slici ilustracija. Zatvori prozor i probaj ponovo.
          </p>
        )}

        <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-sage/15 px-3.5 py-3 text-[13px] font-semibold text-sage-deep">
          {!copied ? (
            <>
              <Link2 className="mt-0.5 size-4 shrink-0" aria-hidden /> Link nije kopiran automatski. Pritisni „Kopiraj link“ ispod.
            </>
          ) : (
            <>
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> Link akcije je kopiran. U story-ju dodaj nalepnicu „Link“ i nalepi ga.
            </>
          )}
        </p>

        <div className="mt-4 grid gap-2.5">
          {canShareFile && (
            <button onClick={share} className="btn-primary w-full gap-2">
              <Share2 className="size-4" aria-hidden /> Podeli (izaberi Instagram)
            </button>
          )}
          <button onClick={download} disabled={!preview} className={`${canShareFile ? 'btn-secondary' : 'btn-primary'} w-full gap-2`}>
            <Download className="size-4" aria-hidden /> Preuzmi sliku
          </button>
          <button onClick={copyLink} className="btn-secondary w-full gap-2">
            <Link2 className="size-4" aria-hidden /> Kopiraj link
          </button>
        </div>

        <ol className="mt-4 list-decimal space-y-1 pl-5 text-[12.5px] text-ink/65">
          <li>{canShareFile ? 'Podeli sliku i u Instagramu izaberi „Story“.' : 'Preuzmi sliku i dodaj je u Instagram story.'}</li>
          <li>Dodaj nalepnicu „Link“ i nalepi kopirani link, na prazno mesto ispod poziva.</li>
        </ol>
      </div>
    </dialog>
  )
}
