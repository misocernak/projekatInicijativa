import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import MobileMenu from './MobileMenu'
import Wordmark from './Wordmark'
import { useAuth } from '../context/AuthContext'
import { BRAND } from '../data/constants'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `relative px-1 py-2 text-[13px] font-medium tracking-[0.04em] transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-sage-dark after:transition-transform ${
    isActive
      ? 'text-sage-deep after:scale-x-100'
      : 'text-sage-deep/70 after:scale-x-0 hover:text-sage-deep hover:after:scale-x-100'
  }`

function Logo() {
  return (
    <Link to="/" className="flex items-center" aria-label={`${BRAND.name} – početna`}>
      <Wordmark />
    </Link>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const closeMenu = useCallback(() => setOpen(false), [])

  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#sadrzaj"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Preskoči na sadržaj
      </a>
      <header
        className={`sticky top-0 z-[1100] transition-all duration-300 ${
          scrolled
            ? 'border-b border-sand/80 bg-cream/90 shadow-[0_8px_24px_-20px_rgb(47_58_34/0.5)] backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-9 md:flex" aria-label="Glavna navigacija">
            <NavLink to="/inicijative" className={navCls}>
              Akcije
            </NavLink>
            <NavLink to="/realizovano" className={navCls}>
              Realizovano
            </NavLink>
            <NavLink to="/o-projektu" className={navCls}>
              O projektu
            </NavLink>
            {user && (
              <NavLink to="/profil" className={navCls}>
                Moj profil
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navCls}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <button onClick={logout} className="btn-secondary min-h-11 px-5">
                Odjava
              </button>
            ) : (
              <Link to="/prijava" className="btn-secondary min-h-11 px-5">
                Prijava
              </Link>
            )}
            <Link to="/nova-inicijativa" className="btn-primary min-h-11 px-5">
              Pokreni akciju
            </Link>
          </div>
          <button
            className="grid size-11 place-items-center rounded-full text-sage-deep hover:bg-sand md:hidden"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobilni-meni"
            aria-label="Otvori meni"
          >
            <Menu />
          </button>
        </div>
      </header>

      <MobileMenu open={open} onClose={closeMenu} />

      <main id="sadrzaj" className="-mt-20 flex-1 pt-20">
        <Outlet />
      </main>

      <footer className="mt-24 border-t border-sand bg-mist text-sage-deep">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-sm font-semibold leading-snug text-sage-deep/80">
              Čistiš, sadiš, krečiš? Objavi akciju i okupi komšije.
            </p>
          </div>
          <nav aria-label="Podnožje" className="flex flex-col gap-2.5 text-sm text-sage-deep/75">
            <span className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sage-dark">Platforma</span>
            <Link to="/inicijative" className="hover:text-sage-deep hover:underline">
              Akcije
            </Link>
            <Link to="/nova-inicijativa" className="hover:text-sage-deep hover:underline">
              Pokreni akciju
            </Link>
            <Link to="/realizovano" className="hover:text-sage-deep hover:underline">
              Realizovano
            </Link>
            <Link to="/o-projektu" className="hover:text-sage-deep hover:underline">
              O projektu
            </Link>
            <Link to="/privatnost" className="hover:text-sage-deep hover:underline">
              Politika privatnosti
            </Link>
            <Link to="/uslovi" className="hover:text-sage-deep hover:underline">
              Uslovi korišćenja
            </Link>
          </nav>
          <div className="flex flex-col gap-2.5 text-sm text-sage-deep/75">
            <span className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sage-dark">Nalog</span>
            <Link to="/prijava" className="hover:text-sage-deep hover:underline">
              Prijava i registracija
            </Link>
            <Link to="/profil" className="hover:text-sage-deep hover:underline">
              Moj profil
            </Link>
          </div>
        </div>
        <div className="border-t border-sand py-5 text-center text-xs text-sage-deep/60">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. Akcije u tvom kraju.
          </p>
          <p className="mt-1.5">
            Developed by{' '}
            <a href="https://cernak.rs" target="_blank" rel="noopener" className="font-semibold text-sage-deep hover:underline">
              černak.rs
            </a>{' '}
            ·{' '}
            <a
              href="https://www.instagram.com/dva____debila/"
              target="_blank"
              rel="noopener"
              className="font-semibold text-sage-deep hover:underline"
            >
              dva debila
            </a>{' '}
            with love ♥
          </p>
        </div>
      </footer>
    </div>
  )
}
