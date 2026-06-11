import type { AppNotification } from '@/types/notification'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes ─────────────────────────────────────────────────────────

interface ApiNotification {
  id: string; type: string; title: string; message: string
  link: string | null; read: boolean; created_at: string
}

function toNotification(r: ApiNotification): AppNotification {
  return {
    id: r.id, type: r.type as AppNotification['type'], title: r.title,
    message: r.message, link: r.link, read: r.read, createdAt: r.created_at,
  }
}

// ── Demo data ──────────────────────────────────────────────────────────────

const NOW = Date.now()

let demoNotifications: AppNotification[] = [
  { id: 'n1', type: 'milestone', title: 'Milestone completed', message: 'Thabo Ndlovu completed "Foundation poured" on Khayelitsha Housing', link: '/projects/1', read: false, createdAt: new Date(NOW - 30 * 60000).toISOString() },
  { id: 'n2', type: 'post', title: 'New site update', message: 'Lerato Dube posted an update on Gaborone Mall Extension', link: '/projects/2', read: false, createdAt: new Date(NOW - 3 * 3600000).toISOString() },
  { id: 'n3', type: 'budget', title: 'Project over budget', message: 'Windhoek Office Park has exceeded its budget of R12,000,000', link: '/projects/3', read: true, createdAt: new Date(NOW - 26 * 3600000).toISOString() },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: authHeaders() })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── API ────────────────────────────────────────────────────────────────────

export async function getNotifications(unreadOnly = false): Promise<AppNotification[]> {
  if (DEMO) {
    return demoNotifications.filter(n => !unreadOnly || !n.read)
  }
  const raw = await api<ApiNotification[]>(`/notifications${unreadOnly ? '?unread_only=true' : ''}`)
  return raw.map(toNotification)
}

export async function getUnreadCount(): Promise<number> {
  if (DEMO) return demoNotifications.filter(n => !n.read).length
  const res = await api<{ count: number }>('/notifications/unread-count')
  return res.count
}

export async function markRead(id: string): Promise<void> {
  if (DEMO) {
    demoNotifications = demoNotifications.map(n => n.id === id ? { ...n, read: true } : n)
    return
  }
  await api<ApiNotification>(`/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllRead(): Promise<void> {
  if (DEMO) {
    demoNotifications = demoNotifications.map(n => ({ ...n, read: true }))
    return
  }
  return api<void>('/notifications/read-all', { method: 'PATCH' })
}

export async function deleteNotification(id: string): Promise<void> {
  if (DEMO) {
    demoNotifications = demoNotifications.filter(n => n.id !== id)
    return
  }
  return api<void>(`/notifications/${id}`, { method: 'DELETE' })
}
