import { useEffect } from 'react'

const SITE = 'https://lepsasrbija.com'
const DEFAULT_IMAGE = `${SITE}/og-default.png`

export interface Meta {
  title: string
  description: string
  image?: string
}

/** Naslovi i opisi stranica (isti spisak je na serveru: backend/app/Http/Controllers/SeoController.php). */
const PAGES: Record<string, Meta> = {
  '/': {
    title: 'Lepša Srbija – akcije u tvom gradu',
    description: 'Pokreni akciju u svom kraju ili se priključi komšijama: čišćenje, sadnja, uređenje, pomoć starijima.',
  },
  '/inicijative': {
    title: 'Sve akcije u tvom gradu | Lepša Srbija',
    description: 'Pronađi akciju u svom gradu i prijavi se: čišćenje, sadnja, uređenje prostora, pomoć komšijama. Za prijavu su dovoljni ime i mejl.',
  },
  '/realizovano': {
    title: 'Realizovano: šta je urađeno kad se složimo | Lepša Srbija',
    description: 'Završene akcije komšija širom Srbije, sa rezultatima i brojem volontera. Pogledaj šta je urađeno i pokreni sledeću u svom kraju.',
  },
  '/nova-inicijativa': {
    title: 'Pokreni akciju u svom kraju | Lepša Srbija',
    description: 'Opiši akciju, označi mesto na mapi i odredi vreme. Komšije iz tvog grada se prijavljuju, a ti znaš koliko ih dolazi.',
  },
  '/o-projektu': {
    title: 'O projektu | Lepša Srbija',
    description: 'Lepša Srbija okuplja ljude oko akcija u njihovom kraju. Ovde se ne skuplja novac: sajt služi samo da se zna šta se radi, gde, kada i koliko ljudi dolazi.',
  },
  '/prijava': {
    title: 'Prijava i registracija | Lepša Srbija',
    description: 'Prijavi se ili napravi nalog da pokreneš akciju u svom gradu. Za prijavu na tuđu akciju nalog ti ne treba.',
  },
  '/privatnost': {
    title: 'Politika privatnosti | Lepša Srbija',
    description: 'Koje podatke čuvamo, zašto, ko ih vidi i kako možeš da ih izbrišeš.',
  },
  '/uslovi': {
    title: 'Uslovi korišćenja | Lepša Srbija',
    description: 'Pravila korišćenja platforme Lepša Srbija za organizatore i volontere.',
  },
}

const FALLBACK = PAGES['/']

export function metaFor(pathname: string): Meta {
  return PAGES[pathname.replace(/\/+$/, '') || '/'] ?? FALLBACK
}

function setTag(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector)
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta')
    const m = selector.match(/\[(\w+)="([^"]+)"\]/)
    if (m) el.setAttribute(m[1], m[2])
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

/** Postavlja naslov, opis i sliku za deljenje u trenutnom dokumentu (pretraživači i deljenje čitaju i ovo). */
export function applyMeta(meta: Meta, pathname = window.location.pathname) {
  const image = meta.image ?? DEFAULT_IMAGE
  const url = `${SITE}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`
  document.title = meta.title
  setTag('meta[name="description"]', 'content', meta.description)
  setTag('link[rel="canonical"]', 'href', url)
  setTag('meta[property="og:url"]', 'content', url)
  setTag('meta[property="og:title"]', 'content', meta.title)
  setTag('meta[property="og:description"]', 'content', meta.description)
  setTag('meta[property="og:image"]', 'content', image)
  setTag('meta[name="twitter:title"]', 'content', meta.title)
  setTag('meta[name="twitter:description"]', 'content', meta.description)
  setTag('meta[name="twitter:image"]', 'content', image)
}

/** Stranica sa sopstvenim sadržajem (npr. jedna akcija) postavlja svoje podatke čim ih učita. */
export function usePageMeta(meta: Meta | undefined) {
  useEffect(() => {
    if (meta) applyMeta(meta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.title, meta?.description, meta?.image])
}
