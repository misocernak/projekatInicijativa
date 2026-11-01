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

/** Pravi PNG 1080×1920 za Instagram story. Ako se fotografija akcije ne može učitati, koristi se ilustracija vrste. */
export async function renderStory(item: Initiative): Promise<Blob> {
  try {
    return await renderOnce(item)
  } catch (err) {
    if (!item.image) throw err
    return renderOnce({ ...item, image: undefined })
  }
}
