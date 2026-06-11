import type { PunchItem, PunchSummary, CreatePunchItemData } from '@/types/punch'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes ─────────────────────────────────────────────────────────

interface ApiPunchItem {
  id: string; company_id: string; project_id: string; title: string
  description: string | null; status: string; priority: string
  assigned_to_id: string | null; assigned_to_name: string | null
  due_date: string | null; resolved_at: string | null
  created_by_id: string; created_by_name: string; created_at: string
}

interface ApiPunchSummary {
  total: number; open: number; in_progress: number; resolved: number
}

function toItem(r: ApiPunchItem): PunchItem {
  return {
    id: r.id, companyId: r.company_id, projectId: r.project_id,
    title: r.title, description: r.description,
    status: r.status as PunchItem['status'], priority: r.priority as PunchItem['priority'],
    assignedToId: r.assigned_to_id, assignedToName: r.assigned_to_name,
    dueDate: r.due_date, resolvedAt: r.resolved_at,
    createdById: r.created_by_id, createdByName: r.created_by_name, createdAt: r.created_at,
  }
}

// ── Demo data ──────────────────────────────────────────────────────────────

const NOW = Date.now()
const d = (daysAgo: number) => new Date(NOW - daysAgo * 86400000).toISOString().split('T')[0]

let demoItems: PunchItem[] = [
  { id: 'pi1', companyId: '1', projectId: '1', title: 'Cracked render on eastern wall — Block C', description: 'Visible crack running 1.2m along eastern face of Block C. Needs patching before painting.', status: 'Open', priority: 'High', assignedToId: 'u2', assignedToName: 'Sipho Dlamini', dueDate: d(-3), resolvedAt: null, createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 10 * 86400000).toISOString() },
  { id: 'pi2', companyId: '1', projectId: '1', title: 'Missing skirting boards — Units 4 & 5', description: null, status: 'In Progress', priority: 'Medium', assignedToId: 'u2', assignedToName: 'Sipho Dlamini', dueDate: d(4), resolvedAt: null, createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 8 * 86400000).toISOString() },
  { id: 'pi3', companyId: '1', projectId: '1', title: 'HVAC unit not commissioned — Level 2', description: 'Level 2 HVAC unit installed but not yet tested and commissioned by sub.', status: 'Open', priority: 'Critical', assignedToId: null, assignedToName: null, dueDate: d(-1), resolvedAt: null, createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 6 * 86400000).toISOString() },
  { id: 'pi4', companyId: '1', projectId: '1', title: 'Touch-up paint required — stairwell', description: null, status: 'Resolved', priority: 'Low', assignedToId: 'u3', assignedToName: 'Amos Banda', dueDate: null, resolvedAt: new Date(NOW - 2 * 86400000).toISOString(), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 14 * 86400000).toISOString() },
  { id: 'pi5', companyId: '1', projectId: '1', title: 'Plumbing leak under sink — Unit 2 kitchen', description: 'Small drip from waste connection. Plumber notified.', status: 'In Progress', priority: 'High', assignedToId: 'u2', assignedToName: 'Sipho Dlamini', dueDate: d(2), resolvedAt: null, createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 3 * 86400000).toISOString() },
  { id: 'pi6', companyId: '1', projectId: '2', title: 'Steel connection bolts — Gridline D/5 missing', description: 'Three bolts not installed at intersection. Structural concern.', status: 'Open', priority: 'Critical', assignedToId: null, assignedToName: null, dueDate: d(-2), resolvedAt: null, createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 5 * 86400000).toISOString() },
  { id: 'pi7', companyId: '1', projectId: '2', title: 'Fire door not self-closing — Floor 3', description: null, status: 'Open', priority: 'High', assignedToId: 'u3', assignedToName: 'Amos Banda', dueDate: d(7), resolvedAt: null, createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 4 * 86400000).toISOString() },
  { id: 'pi8', companyId: '1', projectId: '3', title: 'Roof sheet misalignment — Bay 7', description: 'IBR sheets not aligned at ridge. Water ingress risk.', status: 'Open', priority: 'High', assignedToId: null, assignedToName: null, dueDate: d(3), resolvedAt: null, createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 2 * 86400000).toISOString() },
]

let nextId = 900

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

export async function getPunchItems(projectId: string, statusFilter?: string): Promise<PunchItem[]> {
  if (DEMO) {
    let items = demoItems.filter(i => i.projectId === projectId)
    if (statusFilter) items = items.filter(i => i.status === statusFilter)
    return items
  }
  const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
  const raw = await api<ApiPunchItem[]>(`/punch/projects/${projectId}${params}`)
  return raw.map(toItem)
}

export async function getPunchSummary(projectId: string): Promise<PunchSummary> {
  if (DEMO) {
    const items = demoItems.filter(i => i.projectId === projectId)
    return {
      total: items.length,
      open: items.filter(i => i.status === 'Open').length,
      inProgress: items.filter(i => i.status === 'In Progress').length,
      resolved: items.filter(i => i.status === 'Resolved').length,
    }
  }
  const raw = await api<ApiPunchSummary>(`/punch/projects/${projectId}/summary`)
  return { total: raw.total, open: raw.open, inProgress: raw.in_progress, resolved: raw.resolved }
}

export async function createPunchItem(projectId: string, data: CreatePunchItemData): Promise<PunchItem> {
  if (DEMO) {
    const item: PunchItem = {
      id: String(nextId++), companyId: '1', projectId,
      title: data.title, description: data.description ?? null,
      status: data.status, priority: data.priority,
      assignedToId: data.assignedToId ?? null, assignedToName: null,
      dueDate: data.dueDate ?? null, resolvedAt: null,
      createdById: 'u1', createdByName: 'Admin', createdAt: new Date().toISOString(),
    }
    demoItems = [item, ...demoItems]
    return item
  }
  const raw = await api<ApiPunchItem>(`/punch/projects/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({
      title: data.title, description: data.description ?? null,
      priority: data.priority, status: data.status,
      assigned_to_id: data.assignedToId ?? null,
      due_date: data.dueDate ?? null,
    }),
  })
  return toItem(raw)
}

export async function updatePunchItem(id: string, data: CreatePunchItemData): Promise<PunchItem> {
  if (DEMO) {
    demoItems = demoItems.map(i => i.id === id ? {
      ...i, ...data,
      description: data.description ?? null,
      assignedToId: data.assignedToId ?? null,
      dueDate: data.dueDate ?? null,
      resolvedAt: data.status === 'Resolved' ? new Date().toISOString() : null,
    } : i)
    return demoItems.find(i => i.id === id)!
  }
  const raw = await api<ApiPunchItem>(`/punch/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: data.title, description: data.description ?? null,
      priority: data.priority, status: data.status,
      assigned_to_id: data.assignedToId ?? null,
      due_date: data.dueDate ?? null,
    }),
  })
  return toItem(raw)
}

export async function resolvePunchItem(id: string): Promise<PunchItem> {
  if (DEMO) {
    demoItems = demoItems.map(i => i.id === id ? { ...i, status: 'Resolved', resolvedAt: new Date().toISOString() } : i)
    return demoItems.find(i => i.id === id)!
  }
  const raw = await api<ApiPunchItem>(`/punch/${id}/resolve`, { method: 'PATCH' })
  return toItem(raw)
}

export async function deletePunchItem(id: string): Promise<void> {
  if (DEMO) { demoItems = demoItems.filter(i => i.id !== id); return }
  return api<void>(`/punch/${id}`, { method: 'DELETE' })
}

// ── Company-wide open count (for dashboard) ────────────────────────────────

export async function getCompanyOpenPunchCount(): Promise<number> {
  if (DEMO) return demoItems.filter(i => i.status !== 'Resolved').length
  const raw = await api<{ count: number }>('/punch/company/open-count')
  return raw.count
}
