import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import StoryCard, { STORY_H, STORY_W } from '../components/StoryCard'
import type { Initiative } from '../types'

/** Sledeći frejm; rezervni tajmer postoji jer pregledač ne crta frejmove dok je tab u pozadini. */
const nextFrame = () =>
  new Promise<void>((r) => {
    requestAnimationFrame(() => r())
    setTimeout(r, 120)
  })

/** SVG (sa ugrađenim stilovima, slikama i fontovima) u PNG 1080×1920. */
async function svgToPng(svgUrl: string): Promise<Blob> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Slika se ne može napraviti.'))
    img.src = svgUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = STORY_W
  canvas.height = STORY_H
  canvas.getContext('2d')!.drawImage(img, 0, 0, STORY_W, STORY_H)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Slika se ne može napraviti.'))), 'image/png'),
  )
}

/**
 * Fotografija akcije se unapred učitava kao data URL, da je pravljenje slike ne zavisi od CORS-a.
 * Adresa se uzima sa trenutnog domena (www i bez www su različiti izvori), a ako ne uspe, vraća se undefined
 * i story dobija ilustraciju vrste.
 */
async function photoAsDataUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined
  try {
    const local = new URL(url, window.location.origin)
    const res = await fetch(`${window.location.origin}${local.pathname}`, { cache: 'force-cache' })
    if (!res.ok) return undefined
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return undefined
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

async function renderOnce(item: Initiative): Promise<Blob> {
  const { toSvg } = await import('html-to-image')

  // kartica se crta van ekrana u punoj veličini (1080×1920) i pretvara u PNG
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${STORY_W}px;height:${STORY_H}px;pointer-events:none;`
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    root.render(createElement(StoryCard, { item }))
    await nextFrame()
    await nextFrame()
    await document.fonts.ready
    await Promise.all(
      Array.from(host.querySelectorAll('img')).map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null) }))),
    )

    const options = { width: STORY_W, height: STORY_H, pixelRatio: 1, cacheBust: false, backgroundColor: '#fbfaf7' }
    const node = host.firstElementChild as HTMLElement
    // prvi poziv zagreva slike i fontove (Safari ih inače ume da izostavi)
    await toSvg(node, options).catch(() => null)
    const svg = await toSvg(node, options)
    return await svgToPng(svg)
  } finally {
    root.unmount()
    host.remove()
  }
}

/** Pravi PNG 1080×1920 za Instagram story. Bez fotografije (ili ako se ne učita) koristi se ilustracija vrste. */
export async function renderStory(item: Initiative): Promise<Blob> {
  const image = await photoAsDataUrl(item.image ?? item.result?.after)
  try {
    return await renderOnce({ ...item, image })
  } catch (err) {
    if (!image) throw err
    return renderOnce({ ...item, image: undefined })
  }
}
