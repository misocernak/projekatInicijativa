import { trackView } from '../api'

let last = ''
let landing = true

/** Šalje jednu posetu po strani (bez duplikata uzastopnih). Izvor (referrer, utm_source) samo pri dolasku na sajt. */
export function trackPage(pathname: string, search: string) {
  if (!import.meta.env.PROD || pathname === last) return
  last = pathname

  let referrer = ''
  let source = ''
  if (landing) {
    landing = false
    referrer = document.referrer
    source = new URLSearchParams(search).get('utm_source') ?? ''
  }
  trackView(pathname, referrer, source)
}
