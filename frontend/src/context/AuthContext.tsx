import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as api from '../api'
import type { User } from '../types'

interface AuthValue {
  user: User | null
  /** false dok se ne proveri da li postoji aktivna sesija (izbegava treperenje "Prijava") */
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: api.RegisterData) => Promise<{ verificationEmailSent: boolean }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setUser(await api.getMe())
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setReady(true))
  }, [refresh])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      refresh,
      login: async (email, password) => setUser(await api.login(email, password)),
      register: async (data) => {
        const res = await api.register(data)
        setUser(res.user)
        return { verificationEmailSent: res.verificationEmailSent }
      },
      logout: async () => {
        try {
          await api.logout()
        } finally {
          setUser(null)
        }
      },
    }),
    [user, ready, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth mora biti unutar AuthProvider')
  return ctx
}
