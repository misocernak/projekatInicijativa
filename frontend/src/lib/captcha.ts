/**
 * Cloudflare Turnstile: widget (components/Turnstile.tsx) javlja token ovde, a api klijent ga uzima pri slanju
 * zaštićenih zahteva. Token važi za jedan zahtev, pa se posle upotrebe widget osvežava.
 */
let token: string | null = null
let waiters: ((t: string | null) => void)[] = []
const resets = new Set<() => void>()
let active = 0

export const captcha = {
  /** broj widgeta na ekranu; bez njih (nije podešeno ili nema forme) ne čeka se ništa */
  mount(reset: () => void) {
    active += 1
    resets.add(reset)
    return () => {
      active -= 1
      resets.delete(reset)
    }
  },

  set(next: string | null) {
    token = next
    if (next) waiters.splice(0).forEach((w) => w(next))
  },

  /** Uzima token (ako ga još nema a widget radi, sačeka do 12 s) i traži novi za sledeći put. */
  async take(): Promise<string | null> {
    if (!token && active > 0) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 12_000)
        waiters.push(() => {
          clearTimeout(timer)
          resolve()
        })
      })
    }
    const used = token
    token = null
    if (used) resets.forEach((r) => r())
    return used
  },
}
