import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import StoryCard, { PHOTO, STORY_H, STORY_W, type StoryMode } from '../components/StoryCard'
import type { Initiative } from '../types'

/** Sledeći frejm; rezervni tajmer postoji jer pregledač ne crta frejmove dok je tab u pozadini. */
const nextFrame = () =>
  new Promise<void>((r) => {
    requestAnimationFrame(() => r())
    setTimeout(r, 120)
  })

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Slika se ne može napraviti.'))
    img.src = src
  })
}

/**
 * Fotografija akcije se unapred učitava kao data URL, da pravljenje slike ne zavisi od CORS-a.
 * Adresa se uzima sa trenutnog domena (www i bez www su različiti izvori).
 */
async function photoAsDataUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined
  try {
    const local = new URL(url, window.location.origin)
    const res = await fetch(`${window.location.origin}${local.pathname}`, { cache: 'no-cache' })
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

interface Layer {
  svg: string
  /** gde je okvir fotografije u kartici (px) */
  photo: { x: number; y: number }
}

/** Kartica se crta van ekrana u punoj veličini (1080×1920) i pretvara u SVG sa ugrađenim stilovima i fontovima. */
async function renderLayer(item: Initiative, mode: StoryMode): Promise<Layer> {
  const { toSvg } = await import('html-to-image')

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${STORY_W}px;height:${STORY_H}px;pointer-events:none;`
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    root.render(createElement(StoryCard, { item, mode }))
    await nextFrame()
    await nextFrame()
    await document.fonts.ready

    const node = host.firstElementChild as HTMLElement
    const box = host.querySelector('[data-story-photo]')?.getBoundingClientRect()
    const origin = host.getBoundingClientRect()
    const options = {
      width: STORY_W,
      height: STORY_H,
      pixelRatio: 1,
      cacheBust: false,
      ...(mode === 'overlay' ? {} : { backgroundColor: '#fbfaf7' }),
    }
    // prvi poziv zagreva fontove (Safari ih inače ume da izostavi)
    await toSvg(node, options).catch(() => null)
    const svg = await toSvg(node, options)

    return { svg, photo: { x: (box?.left ?? origin.left + 80) - origin.left, y: (box?.top ?? origin.top + 340) - origin.top } }
  } finally {
    root.unmount()
    host.remove()
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Slika se ne može napraviti.'))), 'image/png'),
  )
}

function newCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = STORY_W
  canvas.height = STORY_H
  return { canvas, ctx: canvas.getContext('2d')! }
}

/** Ilustracija vrste (bez fotografije): cela kartica kao jedna slika. */
async function renderIllustrated(item: Initiative): Promise<Blob> {
  const layer = await renderLayer({ ...item, image: undefined }, 'full')
  const img = await loadImage(layer.svg)
  const { canvas, ctx } = newCanvas()
  ctx.drawImage(img, 0, 0, STORY_W, STORY_H)
  return toBlob(canvas)
}

/**
 * Sa fotografijom: pozadina i tekst, pa fotografija nacrtana direktno na platno (isečena i zaobljena), pa datum preko nje.
 * Fotografija se ne stavlja u SVG, jer pregledači slike unutar SVG-a ponekad ne dekodiraju na vreme.
 */
async function renderWithPhoto(item: Initiative, photoUrl: string): Promise<Blob> {
  const photo = await loadImage(photoUrl)
  await photo.decode().catch(() => undefined)

  const base = await renderLayer({ ...item, image: undefined }, 'base')
  const overlay = await renderLayer({ ...item, image: undefined }, 'overlay')
  const [baseImg, overlayImg] = await Promise.all([loadImage(base.svg), loadImage(overlay.svg)])

  const { canvas, ctx } = newCanvas()
  ctx.drawImage(baseImg, 0, 0, STORY_W, STORY_H)

  const { x, y } = base.photo
  const scale = Math.max(PHOTO.w / photo.naturalWidth, PHOTO.h / photo.naturalHeight)
  const dw = photo.naturalWidth * scale
  const dh = photo.naturalHeight * scale
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, PHOTO.w, PHOTO.h, PHOTO.radius)
  ctx.clip()
  ctx.drawImage(photo, x + (PHOTO.w - dw) / 2, y + (PHOTO.h - dh) / 2, dw, dh)
  // blago zatamnjenje pri vrhu i dnu, kao na kartici akcije
  const shade = ctx.createLinearGradient(0, y, 0, y + PHOTO.h)
  shade.addColorStop(0, 'rgba(0,0,0,0.22)')
  shade.addColorStop(0.45, 'rgba(0,0,0,0)')
  shade.addColorStop(1, 'rgba(0,0,0,0.16)')
  ctx.fillStyle = shade
  ctx.fillRect(x, y, PHOTO.w, PHOTO.h)
  ctx.restore()

  ctx.drawImage(overlayImg, 0, 0, STORY_W, STORY_H)
  return toBlob(canvas)
}

export interface StoryResult {
  blob: Blob
  /** da li je fotografija akcije ušla u sliku (false: ilustracija vrste) */
  photo: boolean
}

/** Pravi PNG 1080×1920 za Instagram story: fotografija akcije ako postoji, inače ilustracija vrste. */
export async function renderStory(item: Initiative): Promise<StoryResult> {
  const source = item.image ?? item.result?.after
  const photoUrl = source ? ((await photoAsDataUrl(source)) ?? (await photoAsDataUrl(source))) : undefined

  if (photoUrl) {
    try {
      return { blob: await renderWithPhoto(item, photoUrl), photo: true }
    } catch {
      /* ispod: ilustracija */
    }
  }
  return { blob: await renderIllustrated(item), photo: false }
}
