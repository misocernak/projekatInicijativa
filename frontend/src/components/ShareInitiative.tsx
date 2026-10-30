import { useState } from 'react'
import { Check, Link2, Mail, Share2 } from 'lucide-react'
import { BRAND } from '../data/constants'
import { BRAND_PATHS } from '../data/brandIcons'

function Brand({ name }: { name: keyof typeof BRAND_PATHS }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0 fill-current text-sage-dark" aria-hidden>
      <path d={BRAND_PATHS[name]} />
    </svg>
  )
}

interface Props {
  id: string
  title: string
  /** npr. "Čačak, 14. novembar" — ulazi u poruku kojom se poziva */
  when: string
  where: string
}

/** Deljenje akcije: poruka sa pozivom + dugmad za najčešće načine (poruke, mreže, mejl, kopiranje linka). */
export default function ShareInitiative({ id, title, when, where }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/inicijative/${id}`
  const text = `Pridruži se akciji „${title}“ (${where}${when ? `, ${when}` : ''}) na ${BRAND.name}.`
  const full = `${text} ${url}`
  const enc = encodeURIComponent
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const t = document.createElement('textarea')
      t.value = url
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url })
    } catch {
      /* korisnik je zatvorio meni za deljenje */
    }
  }

  const chip =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sand bg-white px-4 text-[13px] font-semibold text-sage-deep transition hover:border-sage-dark/40 hover:bg-mist'

  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${enc(full)}`, icon: <Brand name="whatsapp" /> },
    { label: 'Viber', href: `viber://forward?text=${enc(full)}`, icon: <Brand name="viber" /> },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, icon: <Brand name="facebook" /> },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`, icon: <Brand name="x" /> },
    { label: 'Mejl', href: `mailto:?subject=${enc(`Poziv: ${title}`)}&body=${enc(full)}`, icon: <Mail className="size-[18px] text-sage-dark" aria-hidden /> },
  ]

  return (
    <section className="mt-6 border-t border-sand pt-5" aria-label="Pozovi druge">
      <h2 className="font-display text-lg font-extrabold text-sage-deep">Pozovi i druge</h2>
      <p className="mt-1 text-[13px] text-ink/65">Što nas je više, to se brže završi. Pošalji poziv prijateljima, komšijama, kolegama.</p>

      {canNative && (
        <button onClick={nativeShare} className="btn-primary mt-4 w-full gap-2">
          <Share2 className="size-4" aria-hidden /> Podeli
        </button>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={chip}>
            {l.icon} {l.label}
          </a>
        ))}
        <button onClick={copy} className={chip}>
          {copied ? <Check className="size-4 text-sage-dark" aria-hidden /> : <Link2 className="size-4 text-sage-dark" aria-hidden />}
          {copied ? 'Link kopiran' : 'Kopiraj link'}
        </button>
      </div>
      <span role="status" className="sr-only">
        {copied ? 'Link je kopiran.' : ''}
      </span>
    </section>
  )
}
