import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BRAND } from '../data/constants'
import { useEffect } from 'react'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${
    isActive ? 'bg-sand text-sage-deep' : 'text-sage-deep/80 hover:bg-sand/70'
  }`

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${BRAND.name} – početna`}>
      <img src="/favicon.svg" alt="" className="size-9" />
      <span className="font-display text-2xl text-sage-deep">{BRAND.name}</span>
    </Link>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#sadrzaj"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Preskoči na sadržaj
      </a>
      <header className="sticky top-0 z-40 border-b border-sand bg-cream/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Glavna navigacija">
            <NavLink to="/inicijative" className={navCls}>
              Inicijative
            </NavLink>
            <NavLink to="/o-projektu" className={navCls}>
              O projektu
            </NavLink>
            {user && (
              <NavLink to="/profil" className={navCls}>
                Moj profil
              </NavLink>
            )}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <button onClick={logout} className="btn-secondary">
                Odjava
              </button>
            ) : (
              <Link to="/prijava" className="btn-secondary">
                Prijava
              </Link>
            )}
            <Link to="/nova-inicijativa" className="btn-primary">
              Pokreni inicijativu
            </Link>
          </div>
          <button
            className="grid size-11 place-items-center rounded-full hover:bg-sand md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Zatvori meni' : 'Otvori meni'}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav
            className="flex flex-col gap-1 border-t border-sand px-4 py-3 md:hidden"
            aria-label="Mobilna navigacija"
          >
            <NavLink to="/inicijative" className={navCls}>
              Inicijative
            </NavLink>
            <NavLink to="/o-projektu" className={navCls}>
              O projektu
            </NavLink>
            {user && (
              <NavLink to="/profil" className={navCls}>
                Moj profil
              </NavLink>
            )}
            <Link to="/nova-inicijativa" className="btn-primary mt-2">
              Pokreni inicijativu
            </Link>
            {user ? (
              <button onClick={logout} className="btn-secondary">
                Odjava
              </button>
            ) : (
              <Link to="/prijava" className="btn-secondary">
                Prijava
              </Link>
            )}
          </nav>
        )}
      </header>

      <main id="sadrzaj" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-sand bg-sand/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-sage-deep/80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg text-sage-deep">{BRAND.name}</p>
            <p>Građani uređuju svoj grad, zajedno. Bez novca, samo ljudi i volja.</p>
          </div>
          <nav className="flex gap-5 font-bold" aria-label="Podnožje">
            <Link to="/inicijative" className="hover:underline">
              Inicijative
            </Link>
            <Link to="/o-projektu" className="hover:underline">
              O projektu
            </Link>
            <Link to="/nova-inicijativa" className="hover:underline">
              Pokreni inicijativu
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
