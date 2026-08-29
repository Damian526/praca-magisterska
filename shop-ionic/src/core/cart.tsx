import React, { createContext, useContext, useState, useMemo, useCallback } from 'react'
import type { Service, CartLine } from './types'

type CartCtx = {
  lines: CartLine[]
  add: (s: Service) => void
  remove: (serviceId: string) => void
  setQty: (serviceId: string, q: number) => void
  clear: () => void
  total: number
  count: number
}

const Ctx = createContext<CartCtx | undefined>(undefined)
export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])

  const add = useCallback((s: Service) => {
    setLines(prev => {
      const i = prev.findIndex(l => l.service.id === s.id)
      if (i === -1) return [...prev, { service: s, quantity: 1 }]
      const next = [...prev]
      next[i] = { ...next[i], quantity: next[i].quantity + 1 }
      return next
    })
  }, [])

  const remove = useCallback((id: string) =>
    setLines(prev => prev.filter(l => l.service.id !== id)), [])

  const setQty = useCallback((id: string, q: number) =>
    setLines(prev => q <= 0
      ? prev.filter(l => l.service.id !== id)
      : prev.map(l => l.service.id === id ? { ...l, quantity: q } : l)), [])

  const clear = useCallback(() => setLines([]), [])

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.service.price * l.quantity, 0), [lines])
  const count = useMemo(
    () => lines.reduce((s, l) => s + l.quantity, 0), [lines])

  return (
    <Ctx.Provider value={{ lines, add, remove, setQty, clear, total, count }}>
      {children}
    </Ctx.Provider>
  )
}