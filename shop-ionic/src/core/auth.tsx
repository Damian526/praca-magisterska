import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { apiLogin, apiRegister, setAuthToken } from './api'
import { storage } from '../platform/storage'
import type { User } from './types'

const TOKEN_KEY = 'auth_token'
const USER_KEY  = 'auth_user'

type AuthCtx = {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | undefined>(undefined)
export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)])
        if (t && u) { setAuthToken(t); setUser(JSON.parse(u)) }
      } catch { /* brak sesji */ }
      finally { setReady(true) }
    })()
  }, [])

  const persist = useCallback(async (token: string, u: User) => {
    setAuthToken(token)
    setUser(u)
    await Promise.all([storage.set(TOKEN_KEY, token), storage.set(USER_KEY, JSON.stringify(u))])
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiLogin({ email, password })
    await persist(data.token, data.user)
  }, [persist])

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const { data } = await apiRegister({ email, password, fullName })
    await persist(data.token, data.user)
  }, [persist])

  const logout = useCallback(async () => {
    setAuthToken(null); setUser(null)
    await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)])
  }, [])

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>
}