import { useEffect, useRef } from 'react'
import { authProviders } from '../api'
import { captcha } from '../lib/captcha'

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptReady: Promise<TurnstileApi> | null = null

function loadScript(): Promise<TurnstileApi> {
  scriptReady ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile)
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')))
    s.onerror = () => {
      scriptReady = null
      reject(new Error('turnstile'))
    }
    document.head.appendChild(s)
  })
  return scriptReady
}

/**
 * Cloudflare Turnstile widget. Prikazuje se samo ako je zaštita podešena na serveru, i ostaje nevidljiv dok
 * Cloudflare ne proceni da treba da se potvrdi (retko). Token se šalje automatski uz zaštićene zahteve.
 */
export default function Turnstile() {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let widgetId: string | undefined
    let api: TurnstileApi | undefined
    let release: (() => void) | undefined
    let gone = false

    authProviders()
      .then(async (p) => {
        if (!p.turnstile || gone || !box.current) return
        api = await loadScript()
        if (gone || !box.current) return
        release = captcha.mount(() => api?.reset(widgetId))
        widgetId = api.render(box.current, {
          sitekey: p.turnstile,
          appearance: 'interaction-only',
          callback: (t: string) => captcha.set(t),
          'expired-callback': () => captcha.set(null),
          'error-callback': () => captcha.set(null),
        })
      })
      .catch(() => {
        /* bez provere forma i dalje radi; server odbija zahtev ako je provera obavezna */
      })

    return () => {
      gone = true
      release?.()
      captcha.set(null)
      if (widgetId) api?.remove(widgetId)
    }
  }, [])

  return <div ref={box} className="min-h-0" />
}
