import { API_URL, PAGE_SIZE } from './config'
import { now } from './measure'
import type { Category, Service, Order, User, Paginated } from './types'

let authToken: string | null = null
export function setAuthToken(t: string | null) { authToken = t }

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export type ApiResult<T> = {
  data: T
  serverMs: number | null
  totalMs: number
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {}

  if (init.body) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const t0 = now()
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  const totalMs = now() - t0

  const st = res.headers.get('Server-Timing')
  const serverMs = st ? parseFloat(st.split('dur=')[1]) : null

  if (!res.ok) {
    let msg = `Błąd HTTP ${res.status}`
    try { msg = (await res.json())?.error?.message ?? msg } catch { /* ignoruj */ }
    throw new ApiError(res.status, msg)
  }

  return { data: (await res.json()) as T, serverMs, totalMs }
}

export const apiRegister = (b: { email: string; password: string; fullName: string }) =>
  request<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST', body: JSON.stringify(b)
  })

export const apiLogin = (b: { email: string; password: string }) =>
  request<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify(b)
  })

export const apiMe = () => request<User>('/api/auth/me')

export const apiCategories = () => request<Category[]>('/api/categories')

export function apiServices(opts: {
  page?: number; limit?: number; category?: string; q?: string
} = {}) {
  const p = new URLSearchParams()
  p.set('page', String(opts.page ?? 1))
  p.set('limit', String(opts.limit ?? PAGE_SIZE))
  if (opts.category) p.set('category', opts.category)
  if (opts.q) p.set('q', opts.q)
  return request<Paginated<Service>>(`/api/services?${p.toString()}`)
}

export const apiService = (id: string) => request<Service>(`/api/services/${id}`)

export const apiCreateOrder = (b: {
  items: Array<{ serviceId: string; quantity: number }>
  customerName: string
  customerEmail: string
}) => request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(b) })

export const apiOrders = (page = 1, limit = 20) =>
  request<Paginated<Order>>(`/api/orders?page=${page}&limit=${limit}`)