import type { PortfolioReport, ProjectCsvReport, ProjectReportRow } from '@/types/report'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes ─────────────────────────────────────────────────────────

interface ApiProjectRow {
  id: string; name: string; status: string; progress: number
  budget: string | number; spent: string | number; percent_used: number
  milestones_total: number; milestones_completed: number; punch_open: number
}

interface ApiPortfolioReport {
  projects_total: number
  projects_by_status: Record<string, number>
  total_budget: string | number
  total_spent: string | number
  budget_percent_used: number
  milestones_total: number
  milestones_completed: number
  milestones_overdue: number
  on_time_rate: number | null
  punch_open: number
  punch_resolved: number
  projects: ApiProjectRow[]
}

function toRow(r: ApiProjectRow): ProjectReportRow {
  return {
    id: r.id, name: r.name, status: r.status, progress: r.progress,
    budget: Number(r.budget), spent: Number(r.spent), percentUsed: r.percent_used,
    milestonesTotal: r.milestones_total, milestonesCompleted: r.milestones_completed,
    punchOpen: r.punch_open,
  }
}

function toReport(r: ApiPortfolioReport): PortfolioReport {
  return {
    projectsTotal: r.projects_total,
    projectsByStatus: r.projects_by_status,
    totalBudget: Number(r.total_budget),
    totalSpent: Number(r.total_spent),
    budgetPercentUsed: r.budget_percent_used,
    milestonesTotal: r.milestones_total,
    milestonesCompleted: r.milestones_completed,
    milestonesOverdue: r.milestones_overdue,
    onTimeRate: r.on_time_rate,
    punchOpen: r.punch_open,
    punchResolved: r.punch_resolved,
    projects: r.projects.map(toRow),
  }
}

// ── Demo data ──────────────────────────────────────────────────────────────

const demoReport: PortfolioReport = {
  projectsTotal: 3,
  projectsByStatus: { Active: 2, 'On Hold': 1 },
  totalBudget: 46500000,
  totalSpent: 28400000,
  budgetPercentUsed: 61.1,
  milestonesTotal: 24,
  milestonesCompleted: 14,
  milestonesOverdue: 2,
  onTimeRate: 78.6,
  punchOpen: 7,
  punchResolved: 19,
  projects: [
    { id: '1', name: 'Khayelitsha Housing', status: 'Active', progress: 64, budget: 18500000, spent: 12100000, percentUsed: 65.4, milestonesTotal: 10, milestonesCompleted: 6, punchOpen: 3 },
    { id: '2', name: 'Gaborone Mall Extension', status: 'Active', progress: 41, budget: 16000000, spent: 7800000, percentUsed: 48.8, milestonesTotal: 8, milestonesCompleted: 4, punchOpen: 2 },
    { id: '3', name: 'Windhoek Office Park', status: 'On Hold', progress: 55, budget: 12000000, spent: 8500000, percentUsed: 70.8, milestonesTotal: 6, milestonesCompleted: 4, punchOpen: 2 },
  ],
}

// ── Helpers ────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function downloadCsv(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = disposition.match(/filename="?([^";]+)"?/)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = match?.[1] ?? fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ── API ────────────────────────────────────────────────────────────────────

export async function getPortfolioReport(): Promise<PortfolioReport> {
  if (DEMO) return demoReport
  const raw = await api<ApiPortfolioReport>('/reports/portfolio')
  return toReport(raw)
}

export async function downloadPortfolioCsv(): Promise<void> {
  if (DEMO) throw new Error('Exports are not available in demo mode')
  return downloadCsv('/reports/portfolio/csv', 'portfolio-report.csv')
}

export async function downloadProjectCsv(projectId: string, report: ProjectCsvReport): Promise<void> {
  if (DEMO) throw new Error('Exports are not available in demo mode')
  return downloadCsv(`/reports/projects/${projectId}/csv?report=${report}`, `${report}.csv`)
}
