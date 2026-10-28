import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import * as api from '../api'
import type { User } from '../types'

interface AuthValue {
  user: User | null
  login: (email: string) => Promise<void>
  register: (name: string, email: string, cityId?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => api.getStoredUser())

  const value = useMemo<AuthValue>(
    () => ({
      user,
      login: async (email) => setUser(await api.login(email)),
      register: async (name, email, cityId) => setUser(await api.register(name, email, cityId)),
      logout: () => {
        api.logout()
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth mora biti unutar AuthProvider')
  return ctx
}
