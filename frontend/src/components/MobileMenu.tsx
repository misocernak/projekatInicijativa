import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  ChevronRight,
  CircleUserRound,
  FileText,
  Home,
  Info,
  LogIn,
  LogOut,
  Map as MapIcon,
  PlusCircle,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
  Images,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BRAND } from '../data/constants'
import Wordmark from './Wordmark'

interface Props {
  open: boolean
  onClose: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 first:mt-2">
      <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-sage-deep/45">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

function Item({
  to,
  icon: Icon,
  label,
  active,
  badge,
  end = 'chevron',
  onClick,
}: {
  to?: string
  icon: LucideIcon
  label: string
  active?: boolean
  badge?: string
  end?: 'chevron' | 'arrow'
  onClick: () => void
}) {
  const cls = `flex min-h-14 items-center gap-4 rounded-2xl px-3 text-left text-[15px] transition-colors ${
    active ? 'bg-sage-dark/10 font-bold text-sage-dark' : 'font-medium text-sage-deep hover:bg-mist'
  }`
  const inner = (
    <>
      <Icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full bg-sun px-2.5 py-0.5 text-[11px] font-bold text-sage-deep">{badge}</span>
      )}
      {end === 'arrow' || active ? (
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      ) : (
        <ChevronRight className="size-4 shrink-0 text-sage-deep/35" aria-hidden />
      )}
    </>
  )
  return to ? (
    <Link to={to} onClick={onClick} className={cls} aria-current={active ? 'page' : undefined}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={`${cls} w-full`}>
      {inner}
    </button>
  )
}

export default function MobileMenu({ open, onClose }: Props) {
  const { user, logout } = useAuth()
  const { pathname, search } = useLocation()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const isMap = search.includes('prikaz=mapa')
  const initials = (user?.name ?? '').trim().charAt(0).toUpperCase()

  return (
    <div className={`fixed inset-0 z-[1200] md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-sage-deep/45 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        id="mobilni-meni"
        aria-label="Glavni meni"
        inert={!open}
        className={`absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? 'translate-x-0 shadow-[20px_0_60px_-20px_rgb(20_32_26/0.5)]' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-sand px-5">
          <Link to="/" onClick={onClose} aria-label={`${BRAND.name} – početna`}>
            <Wordmark />
          </Link>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Zatvori meni"
            className="grid size-11 place-items-center rounded-full text-sage-deep hover:bg-mist"
          >
            <X className="size-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <Section title="Istraži">
            <Item to="/" icon={Home} label="Početna" active={pathname === '/'} onClick={onClose} />
            <Item
              to="/inicijative"
              icon={Search}
              label="Sve akcije"
              active={pathname.startsWith('/inicijative') && !isMap}
              onClick={onClose}
            />
            <Item
              to="/inicijative?prikaz=mapa"
              icon={MapIcon}
              label="Mapa akcija"
              active={pathname === '/inicijative' && isMap}
              onClick={onClose}
            />
            <Item
              to="/realizovano"
              icon={Images}
              label="Realizovano"
              active={pathname === '/realizovano'}
              onClick={onClose}
            />
            <Item
              to="/nova-inicijativa"
              icon={PlusCircle}
              label="Pokreni akciju"
              badge="Novo"
              active={pathname === '/nova-inicijativa'}
              onClick={onClose}
            />
          </Section>

          <Section title="Nalog">
            {user ? (
              <>
                <Item to="/profil" icon={CircleUserRound} label="Moj profil" active={pathname === '/profil'} onClick={onClose} />
                {user.role === 'admin' && (
                  <Item to="/admin" icon={ShieldCheck} label="Admin" active={pathname === '/admin'} onClick={onClose} />
                )}
                <Item
                  icon={LogOut}
                  label="Odjava"
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                />
              </>
            ) : (
              <Item to="/prijava" icon={LogIn} label="Prijava / registracija" active={pathname === '/prijava'} onClick={onClose} />
            )}
          </Section>

          <Section title="Informacije">
            <Item to="/o-projektu" icon={Info} label="O projektu" active={pathname === '/o-projektu'} onClick={onClose} />
            <Item to="/privatnost" icon={ShieldCheck} label="Politika privatnosti" active={pathname === '/privatnost'} onClick={onClose} />
            <Item to="/uslovi" icon={FileText} label="Uslovi korišćenja" active={pathname === '/uslovi'} onClick={onClose} />
          </Section>
        </nav>

        <div className="shrink-0 border-t border-sand p-5">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-sage-dark text-base font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0 text-[13px] leading-tight">
                <p className="truncate font-bold text-sage-deep">{user.name}</p>
                <p className="truncate text-ink/55">{user.email}</p>
              </div>
            </div>
          ) : (
            <Link to="/nova-inicijativa" onClick={onClose} className="btn-primary w-full">
              Pokreni akciju
            </Link>
          )}
        </div>
      </aside>
    </div>
  )
}
