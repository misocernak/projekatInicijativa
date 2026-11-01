import { ArrowDown, CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import { categoryLabel, cityName } from '../data/constants'
import { formatDate, formatTime } from '../lib/dates'
import type { Initiative } from '../types'
import { Art, CATEGORY_STYLE } from './Bits'

export const STORY_W = 1080
export const STORY_H = 1920
/** Donjih ~280 px Instagram prekriva poljem za odgovor; iznad toga je mesto za nalepnicu "Link". */
const BOTTOM_SAFE = 280
const STICKER_ZONE = 160

const monthFmt = new Intl.DateTimeFormat('sr-Latn-RS', { month: 'short' })

/**
 * Prikaz jedne akcije za Instagram story: tačno 1080×1920 (9:16), sve mere su u pikselima te veličine.
 * Instagram prekriva gornjih ~250 i donjih ~340 piksela (profil, polje za poruku, nalepnica sa linkom),
 * zato je sav važan sadržaj između. Donja zona je ostavljena prazna za nalepnicu "Link".
 */
/** Okvir fotografije u kartici (1080 px širine, 80 px margine): koristi ga izvoz slike da fotografiju nacrta sam. */
export const PHOTO = { w: 920, h: 440, radius: 56 }

/**
 * mode 'full': cela kartica (fotografija je u njoj).
 * mode 'base' i 'overlay' služe samo za izvoz slike: 'base' je kartica bez fotografije i bez datuma na njoj,
 * a 'overlay' je prozirna kartica sa samo datumom. Fotografiju između njih crta izvoz direktno na platno,
 * pa ne zavisi od toga kada pregledač dekodira slike unutar SVG-a.
 */
export type StoryMode = 'full' | 'base' | 'overlay'

export default function StoryCard({ item, guides = false, mode = 'full' }: { item: Initiative; guides?: boolean; mode?: StoryMode }) {
  const style = CATEGORY_STYLE[item.category]
  const permanent = item.kind === 'permanent' || !item.startDate
  const start = item.startDate ? new Date(item.startDate) : null

  const when = permanent
    ? 'Trajna akcija'
    : item.endDate && formatDate(item.startDate!) === formatDate(item.endDate)
      ? `${formatTime(item.startDate!)} – ${formatTime(item.endDate)}`
      : formatTime(item.startDate!)

  const titleSize = item.title.length > 48 ? 66 : item.title.length > 28 ? 76 : 88

  return (
    <div
      className="relative overflow-hidden font-sans"
      style={{ width: STORY_W, height: STORY_H, background: mode === 'overlay' ? 'transparent' : '#fbfaf7', color: '#14201a', visibility: mode === 'overlay' ? 'hidden' : 'visible' }}
    >
      {/* dekor */}
      <div aria-hidden className="absolute rounded-full" style={{ width: 760, height: 760, right: -260, top: -200, background: '#f6d56b' }} />
      <div aria-hidden className="absolute rounded-full" style={{ width: 520, height: 520, left: -240, top: 980, background: style.bg }} />
      <div aria-hidden className="absolute rounded-full" style={{ width: 420, height: 420, right: -150, bottom: 300, background: '#f2705a', opacity: 0.9 }} />
      <div aria-hidden className="absolute rounded-full bg-white" style={{ width: 54, height: 54, right: 150, top: 150, opacity: 0.85 }} />

      <div className="relative flex h-full flex-col" style={{ padding: '250px 80px 0' }}>
        {/* logo */}
        <div className="font-display font-extrabold leading-none tracking-tight" style={{ fontSize: 58 }}>
          <span style={{ color: '#14201a' }}>lepša</span>
          <span style={{ color: '#0b7a4b' }}>Srbija</span>
          <span style={{ color: 'rgb(20 32 26 / 0.45)', fontWeight: 600 }}>.com</span>
        </div>

        {/* fotografija ili ilustracija */}
        <div className="relative" style={{ marginTop: 34 }} data-story-photo>
          {mode === 'full' ? (
            <Art category={item.category} image={item.image} className="rounded-[56px]">
              <div style={{ width: PHOTO.w, height: PHOTO.h }} />
            </Art>
          ) : (
            <div style={{ width: PHOTO.w, height: PHOTO.h }} />
          )}
          {mode !== 'base' && (
          <div
            className="absolute grid place-items-center bg-white shadow-lg"
            style={{ left: 36, top: 36, minWidth: 140, borderRadius: 34, padding: '18px 26px', lineHeight: 1, visibility: 'visible' }}
          >
            {permanent || !start ? (
              <span className="font-display font-extrabold" style={{ fontSize: 44, color: '#14201a' }}>
                STALNO
              </span>
            ) : (
              <>
                <span className="font-display font-extrabold" style={{ fontSize: 80, color: '#14201a' }}>
                  {start.getDate()}
                </span>
                <span className="font-bold uppercase" style={{ fontSize: 30, letterSpacing: '0.12em', color: '#0b7a4b', marginTop: 6 }}>
                  {monthFmt.format(start).replace('.', '')}
                </span>
              </>
            )}
          </div>
          )}
        </div>

        {/* tekst */}
        <p className="font-bold uppercase" style={{ marginTop: 36, fontSize: 30, letterSpacing: '0.16em', color: style.fg }}>
          {categoryLabel(item.category)}
        </p>
        <h1 className="font-display font-extrabold" style={{ marginTop: 12, fontSize: titleSize, lineHeight: 1.04, letterSpacing: '-0.02em' }}>
          {item.title}
        </h1>

        <ul className="font-semibold" style={{ marginTop: 28, display: 'grid', gap: 14, fontSize: 35, color: 'rgb(20 32 26 / 0.82)' }}>
          <li className="flex items-center" style={{ gap: 18 }}>
            <MapPin style={{ width: 42, height: 42, color: style.fg, flexShrink: 0 }} aria-hidden />
            {cityName(item.cityId)}, {item.address}
          </li>
          <li className="flex items-center" style={{ gap: 18 }}>
            {permanent ? <CalendarDays style={{ width: 42, height: 42, color: style.fg, flexShrink: 0 }} aria-hidden /> : <Clock style={{ width: 42, height: 42, color: style.fg, flexShrink: 0 }} aria-hidden />}
            {permanent ? when : `${formatDate(item.startDate!)}, ${when}`}
          </li>
          {item.participants > 0 && (
            <li className="flex items-center" style={{ gap: 18 }}>
              <Users style={{ width: 42, height: 42, color: style.fg, flexShrink: 0 }} aria-hidden />
              {item.participants} {item.participants === 1 ? 'volonter se već prijavio/la' : 'volontera se već prijavilo'}
            </li>
          )}
        </ul>

        {/* poziv na akciju: običan tekst, a nalepnica "Link" ide odmah ispod njega */}
        <div style={{ marginTop: 'auto', marginBottom: STICKER_ZONE + BOTTOM_SAFE }}>
          <p className="font-display font-extrabold" style={{ fontSize: 92, lineHeight: 1, letterSpacing: '-0.02em', color: '#0b7a4b' }}>
            Priključi se
            <span style={{ background: 'linear-gradient(transparent 62%, #f6d56b 62%, #f6d56b 92%, transparent 92%)', marginLeft: 6 }}>!</span>
          </p>
          <p className="flex items-center font-semibold" style={{ marginTop: 12, gap: 16, fontSize: 36, color: 'rgb(20 32 26 / 0.7)' }}>
            Tapni na link ispod
            <ArrowDown style={{ width: 46, height: 46, color: '#0b7a4b' }} aria-hidden />
          </p>
        </div>

        {/* samo za pregled: gde se stavlja nalepnica i šta Instagram prekriva */}
        {guides && (
          <>
            <div
              className="absolute grid place-items-center font-bold"
              style={{ left: 80, right: 80, bottom: BOTTOM_SAFE + 10, height: STICKER_ZONE - 20, border: '6px dashed #0b7a4b', borderRadius: 40, color: '#0b7a4b', fontSize: 36, background: 'rgb(11 122 75 / 0.06)' }}
            >
              ovde ide nalepnica „Link“
            </div>
            <div
              className="absolute inset-x-0 bottom-0 grid place-items-center font-bold"
              style={{ height: BOTTOM_SAFE, background: 'rgb(20 32 26 / 0.55)', color: '#fff', fontSize: 34 }}
            >
              Instagram: polje za odgovor
            </div>
            <div className="absolute inset-x-0 top-0 grid place-items-center font-bold" style={{ height: 250, background: 'rgb(20 32 26 / 0.55)', color: '#fff', fontSize: 34 }}>
              Instagram: profil i zatvaranje
            </div>
          </>
        )}
      </div>
    </div>
  )
}
