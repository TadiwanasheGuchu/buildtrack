import type {
  BudgetSummary, CompanyBudgetSummary, CostEntry, CreateCostEntryData, BudgetLineIn,
} from '@/types/budget'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes ─────────────────────────────────────────────────────────

interface ApiCategorySummary {
  category: string; allocated: number; spent: number; remaining: number
}
interface ApiBudgetSummary {
  total_budget: number; total_spent: number; remaining: number
  percent_used: number; categories: ApiCategorySummary[]
}
interface ApiCompanyBudgetSummary {
  total_budget: number; total_spent: number; remaining: number; percent_used: number
}
interface ApiCostEntry {
  id: string; company_id: string; project_id: string; category: string
  description: string; amount: number; vendor: string | null
  date: string; created_by_id: string; created_by_name: string; created_at: string
}

function toSummary(r: ApiBudgetSummary): BudgetSummary {
  return {
    totalBudget: Number(r.total_budget),
    totalSpent: Number(r.total_spent),
    remaining: Number(r.remaining),
    percentUsed: r.percent_used,
    categories: r.categories.map(c => ({
      category: c.category as BudgetSummary['categories'][0]['category'],
      allocated: Number(c.allocated),
      spent: Number(c.spent),
      remaining: Number(c.remaining),
    })),
  }
}

function toCompanySummary(r: ApiCompanyBudgetSummary): CompanyBudgetSummary {
  return {
    totalBudget: Number(r.total_budget),
    totalSpent: Number(r.total_spent),
    remaining: Number(r.remaining),
    percentUsed: r.percent_used,
  }
}

function toEntry(r: ApiCostEntry): CostEntry {
  return {
    id: r.id, companyId: r.company_id, projectId: r.project_id,
    category: r.category as CostEntry['category'],
    description: r.description, amount: Number(r.amount), vendor: r.vendor,
    date: r.date, createdById: r.created_by_id, createdByName: r.created_by_name,
    createdAt: r.created_at,
  }
}

// ── Demo data ──────────────────────────────────────────────────────────────

const NOW = Date.now()
const d = (daysAgo: number) => new Date(NOW - daysAgo * 86400000).toISOString().split('T')[0]

let demoEntries: CostEntry[] = [
  { id: 'ce1', companyId: '1', projectId: '1', category: 'Labour', description: 'Foundation crew — week 1', amount: 48000, vendor: 'Dlamini Labour CC', date: d(28), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 28 * 86400000).toISOString() },
  { id: 'ce2', companyId: '1', projectId: '1', category: 'Materials', description: 'Portland cement — 850 bags', amount: 76500, vendor: 'PPC Cement SA', date: d(26), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 26 * 86400000).toISOString() },
  { id: 'ce3', companyId: '1', projectId: '1', category: 'Equipment', description: 'Excavator rental — 2 weeks', amount: 32000, vendor: 'Earthworks Hire', date: d(20), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 20 * 86400000).toISOString() },
  { id: 'ce4', companyId: '1', projectId: '1', category: 'Labour', description: 'Foundation crew — week 2', amount: 48000, vendor: 'Dlamini Labour CC', date: d(14), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 14 * 86400000).toISOString() },
  { id: 'ce5', companyId: '1', projectId: '1', category: 'Subcontractors', description: 'Electrical conduit roughing-in', amount: 55000, vendor: 'Spark Electrical', date: d(7), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 7 * 86400000).toISOString() },
  { id: 'ce6', companyId: '1', projectId: '1', category: 'Permits & Fees', description: 'Building permit — council', amount: 12400, vendor: 'City of Cape Town', date: d(35), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 35 * 86400000).toISOString() },
  { id: 'ce7', companyId: '1', projectId: '2', category: 'Labour', description: 'Steel erection team', amount: 95000, vendor: 'Banda Steel Works', date: d(21), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 21 * 86400000).toISOString() },
  { id: 'ce8', companyId: '1', projectId: '2', category: 'Materials', description: 'H-Beam structural steel', amount: 212000, vendor: 'ArcelorMittal SA', date: d(18), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 18 * 86400000).toISOString() },
  { id: 'ce9', companyId: '1', projectId: '3', category: 'Labour', description: 'Roofing crew', amount: 38000, vendor: 'Cape Roofing Co', date: d(10), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 10 * 86400000).toISOString() },
  { id: 'ce10', companyId: '1', projectId: '3', category: 'Materials', description: 'IBR roof sheeting', amount: 67000, vendor: 'Macsteel', date: d(8), createdById: 'u1', createdByName: 'Admin', createdAt: new Date(NOW - 8 * 86400000).toISOString() },
]

const demoBudgetLines: Record<string, Record<string, number>> = {
  '1': { Labour: 250000, Materials: 200000, Equipment: 80000, Subcontractors: 150000, 'Permits & Fees': 25000, Other: 20000 },
  '2': { Labour: 400000, Materials: 600000, Equipment: 120000, Subcontractors: 200000, 'Permits & Fees': 30000, Other: 50000 },
  '3': { Labour: 180000, Materials: 220000, Equipment: 60000, Subcontractors: 100000, 'Permits & Fees': 20000, Other: 20000 },
}

const DEMO_TOTAL_BUDGET = 3200000 // sum across demo projects
let nextId = 800

function buildDemoSummary(projectId: string, totalBudget: number): BudgetSummary {
  const entries = demoEntries.filter(e => e.projectId === projectId)
  const lines = demoBudgetLines[projectId] ?? {}
  const spentMap: Record<string, number> = {}
  for (const e of entries) {
    spentMap[e.category] = (spentMap[e.category] ?? 0) + e.amount
  }
  const totalSpent = Object.values(spentMap).reduce((a, b) => a + b, 0)
  const cats = ['Labour', 'Materials', 'Equipment', 'Subcontractors', 'Permits & Fees', 'Other'] as const
  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    percentUsed: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0,
    categories: cats.map(cat => ({
      category: cat,
      allocated: lines[cat] ?? 0,
      spent: spentMap[cat] ?? 0,
      remaining: (lines[cat] ?? 0) - (spentMap[cat] ?? 0),
    })),
  }
}

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

// ── Company summary ────────────────────────────────────────────────────────

export async function getCompanyBudgetSummary(): Promise<CompanyBudgetSummary> {
  if (DEMO) {
    const totalSpent = demoEntries.reduce((a, e) => a + e.amount, 0)
    return {
      totalBudget: DEMO_TOTAL_BUDGET,
      totalSpent,
      remaining: DEMO_TOTAL_BUDGET - totalSpent,
      percentUsed: Math.round((totalSpent / DEMO_TOTAL_BUDGET) * 1000) / 10,
    }
  }
  const raw = await api<ApiCompanyBudgetSummary>('/budget/summary')
  return toCompanySummary(raw)
}

// ── Project summary ────────────────────────────────────────────────────────

export async function getBudgetSummary(projectId: string, totalBudget: number): Promise<BudgetSummary> {
  if (DEMO) return buildDemoSummary(projectId, totalBudget)
  const raw = await api<ApiBudgetSummary>(`/budget/projects/${projectId}/summary`)
  return toSummary(raw)
}

// ── Cost entries ───────────────────────────────────────────────────────────

export async function getCostEntries(projectId: string): Promise<CostEntry[]> {
  if (DEMO) return demoEntries.filter(e => e.projectId === projectId)
  const raw = await api<ApiCostEntry[]>(`/budget/projects/${projectId}/entries`)
  return raw.map(toEntry)
}

export async function createCostEntry(projectId: string, data: CreateCostEntryData): Promise<CostEntry> {
  if (DEMO) {
    const entry: CostEntry = {
      id: String(nextId++), companyId: '1', projectId,
      category: data.category, description: data.description, amount: data.amount,
      vendor: data.vendor ?? null, date: data.date,
      createdById: 'u1', createdByName: 'Admin', createdAt: new Date().toISOString(),
    }
    demoEntries = [entry, ...demoEntries]
    return entry
  }
  const raw = await api<ApiCostEntry>(`/budget/projects/${projectId}/entries`, {
    method: 'POST',
    body: JSON.stringify({
      category: data.category, description: data.description,
      amount: data.amount, vendor: data.vendor ?? null, date: data.date,
    }),
  })
  return toEntry(raw)
}

export async function updateCostEntry(id: string, data: CreateCostEntryData): Promise<CostEntry> {
  if (DEMO) {
    demoEntries = demoEntries.map(e => e.id === id ? { ...e, ...data, vendor: data.vendor ?? null } : e)
    return demoEntries.find(e => e.id === id)!
  }
  const raw = await api<ApiCostEntry>(`/budget/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      category: data.category, description: data.description,
      amount: data.amount, vendor: data.vendor ?? null, date: data.date,
    }),
  })
  return toEntry(raw)
}

export async function deleteCostEntry(id: string): Promise<void> {
  if (DEMO) { demoEntries = demoEntries.filter(e => e.id !== id); return }
  return api<void>(`/budget/entries/${id}`, { method: 'DELETE' })
}

// ── Budget lines (allocations) ─────────────────────────────────────────────

export async function saveBudgetLines(projectId: string, lines: BudgetLineIn[]): Promise<void> {
  if (DEMO) {
    demoBudgetLines[projectId] = Object.fromEntries(lines.map(l => [l.category, l.allocatedAmount]))
    return
  }
  await api(`/budget/projects/${projectId}/lines`, {
    method: 'PUT',
    body: JSON.stringify({ lines: lines.map(l => ({ category: l.category, allocated_amount: l.allocatedAmount })) }),
  })
}
