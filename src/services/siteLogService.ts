import type { SiteLog, CreateSiteLogData } from '@/types/siteLog'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes ─────────────────────────────────────────────────────────

interface ApiSiteLog {
  id: string; company_id: string; project_id: string; log_date: string
  weather: string | null; temperature_c: number | null; crew_count: number | null
  work_completed: string; materials_delivered: string | null
  issues: string | null; safety_notes: string | null
  created_by_id: string; created_by_name: string; created_at: string
}

function toLog(r: ApiSiteLog): SiteLog {
  return {
    id: r.id, companyId: r.company_id, projectId: r.project_id,
    logDate: r.log_date, weather: r.weather as SiteLog['weather'],
    temperatureC: r.temperature_c, crewCount: r.crew_count,
    workCompleted: r.work_completed, materialsDelivered: r.materials_delivered,
    issues: r.issues, safetyNotes: r.safety_notes,
    createdById: r.created_by_id, createdByName: r.created_by_name, createdAt: r.created_at,
  }
}

// ── Demo data ──────────────────────────────────────────────────────────────

const NOW = Date.now()
const d = (daysAgo: number) => new Date(NOW - daysAgo * 86400000).toISOString().split('T')[0]

let demoLogs: SiteLog[] = [
  { id: 'sl1', companyId: '1', projectId: '1', logDate: d(0), weather: 'Sunny', temperatureC: 28, crewCount: 24, workCompleted: 'Completed brickwork on Block C second floor. Started electrical first fix in Units 4–6.', materialsDelivered: '8 pallets of bricks, 40 bags of cement', issues: null, safetyNotes: 'Toolbox talk held — working at heights.', createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW).toISOString() },
  { id: 'sl2', companyId: '1', projectId: '1', logDate: d(1), weather: 'Partly Cloudy', temperatureC: 25, crewCount: 22, workCompleted: 'Brickwork Block C continuing. Plumbing rough-in completed for Units 1–3.', materialsDelivered: null, issues: 'Cement delivery delayed by 3 hours — supplier truck breakdown.', safetyNotes: null, createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 86400000).toISOString() },
  { id: 'sl3', companyId: '1', projectId: '1', logDate: d(2), weather: 'Rainy', temperatureC: 19, crewCount: 12, workCompleted: 'Outdoor work suspended after midday due to rain. Interior painting prep in Units 1–2.', materialsDelivered: null, issues: 'Half day lost to weather.', safetyNotes: 'Site walkways muddy — extra signage placed.', createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 2 * 86400000).toISOString() },
  { id: 'sl4', companyId: '1', projectId: '2', logDate: d(0), weather: 'Sunny', temperatureC: 30, crewCount: 35, workCompleted: 'Steel erection gridlines D–F complete. Decking installation started on Level 3.', materialsDelivered: '12 tonnes structural steel', issues: null, safetyNotes: null, createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW).toISOString() },
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

function toApiBody(data: CreateSiteLogData) {
  return {
    log_date: data.logDate,
    weather: data.weather ?? null,
    temperature_c: data.temperatureC ?? null,
    crew_count: data.crewCount ?? null,
    work_completed: data.workCompleted,
    materials_delivered: data.materialsDelivered ?? null,
    issues: data.issues ?? null,
    safety_notes: data.safetyNotes ?? null,
  }
}

// ── API ────────────────────────────────────────────────────────────────────

export async function getSiteLogs(projectId: string): Promise<SiteLog[]> {
  if (DEMO) {
    return demoLogs
      .filter(l => l.projectId === projectId)
      .sort((a, b) => b.logDate.localeCompare(a.logDate))
  }
  const raw = await api<ApiSiteLog[]>(`/site-logs/projects/${projectId}`)
  return raw.map(toLog)
}

export async function createSiteLog(projectId: string, data: CreateSiteLogData): Promise<SiteLog> {
  if (DEMO) {
    const log: SiteLog = {
      id: String(nextId++), companyId: '1', projectId,
      logDate: data.logDate, weather: data.weather ?? null,
      temperatureC: data.temperatureC ?? null, crewCount: data.crewCount ?? null,
      workCompleted: data.workCompleted, materialsDelivered: data.materialsDelivered ?? null,
      issues: data.issues ?? null, safetyNotes: data.safetyNotes ?? null,
      createdById: 'u1', createdByName: 'Admin', createdAt: new Date().toISOString(),
    }
    demoLogs = [log, ...demoLogs]
    return log
  }
  const raw = await api<ApiSiteLog>(`/site-logs/projects/${projectId}`, {
    method: 'POST',
    body: JSON.stringify(toApiBody(data)),
  })
  return toLog(raw)
}

export async function updateSiteLog(id: string, data: CreateSiteLogData): Promise<SiteLog> {
  if (DEMO) {
    demoLogs = demoLogs.map(l => l.id === id ? {
      ...l,
      logDate: data.logDate, weather: data.weather ?? null,
      temperatureC: data.temperatureC ?? null, crewCount: data.crewCount ?? null,
      workCompleted: data.workCompleted, materialsDelivered: data.materialsDelivered ?? null,
      issues: data.issues ?? null, safetyNotes: data.safetyNotes ?? null,
    } : l)
    return demoLogs.find(l => l.id === id)!
  }
  const raw = await api<ApiSiteLog>(`/site-logs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toApiBody(data)),
  })
  return toLog(raw)
}

export async function deleteSiteLog(id: string): Promise<void> {
  if (DEMO) { demoLogs = demoLogs.filter(l => l.id !== id); return }
  return api<void>(`/site-logs/${id}`, { method: 'DELETE' })
}
