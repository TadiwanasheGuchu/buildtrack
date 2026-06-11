import type { CreateMilestoneData, CreateProjectData, Milestone, MilestoneWithProject, Project, ProjectStatus } from '@/types/project'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes (backend returns snake_case) ────────────────────────────

interface ApiProject {
  id: string
  company_id: string
  name: string
  location: string
  status: string
  budget: string | number
  start_date: string | null
  end_date: string | null
  description: string | null
  progress: number
  created_at: string
}

interface ApiMilestone {
  id: string
  project_id: string
  title: string
  due_date: string | null
  completed_at: string | null
}

interface ApiMilestoneWithProject extends ApiMilestone {
  project_name: string
}

function toProject(r: ApiProject): Project {
  return {
    id: r.id,
    companyId: r.company_id,
    name: r.name,
    location: r.location,
    status: r.status as ProjectStatus,
    budget: Number(r.budget),
    startDate: r.start_date ?? '',
    endDate: r.end_date ?? '',
    description: r.description ?? '',
    progress: r.progress,
    createdAt: r.created_at,
  }
}

function toMilestone(r: ApiMilestone): Milestone {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    dueDate: r.due_date ?? '',
    completedAt: r.completed_at,
  }
}

function toMilestoneWithProject(r: ApiMilestoneWithProject): MilestoneWithProject {
  return { ...toMilestone(r), projectName: r.project_name }
}

// ── Demo seed data ─────────────────────────────────────────────────────────

let demoProjects: Project[] = [
  {
    id: '1', companyId: '1',
    name: 'Southern Ridge Residential',
    location: 'Windhoek, Namibia',
    status: 'Active',
    budget: 12_500_000,
    startDate: '2023-03-01', endDate: '2024-06-30',
    description: 'Phase 2 of a 240-unit residential development. Includes foundations, structural steelwork, roofing, and interior fit-out across three blocks.',
    progress: 65, createdAt: '2023-03-01T08:00:00Z',
  },
  {
    id: '2', companyId: '1',
    name: 'Harare High-Rise Extension',
    location: 'Harare, Zimbabwe',
    status: 'Active',
    budget: 8_900_000,
    startDate: '2023-07-01', endDate: '2024-12-31',
    description: 'Six-storey extension to the existing high-rise office complex in the Harare CBD. Steel frame construction with glass curtain wall façade.',
    progress: 42, createdAt: '2023-07-01T08:00:00Z',
  },
  {
    id: '3', companyId: '1',
    name: 'Cape Town Logistics Hub',
    location: 'Cape Town, South Africa',
    status: 'Active',
    budget: 15_200_000,
    startDate: '2023-01-15', endDate: '2023-12-31',
    description: 'Modern 18 000m² logistics facility near the N2 corridor. Pre-engineered steel structure with automated dock levellers and solar roofing.',
    progress: 89, createdAt: '2023-01-15T08:00:00Z',
  },
  {
    id: '4', companyId: '1',
    name: 'Gaborone Business Park',
    location: 'Gaborone, Botswana',
    status: 'Planning',
    budget: 5_500_000,
    startDate: '2024-04-01', endDate: '2025-09-30',
    description: 'Mixed-use business park with four office pavilions and shared amenities in the Phakalane precinct.',
    progress: 0, createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: '5', companyId: '1',
    name: 'Lusaka Road Overpass',
    location: 'Lusaka, Zambia',
    status: 'Delayed',
    budget: 3_200_000,
    startDate: '2023-09-01', endDate: '2024-03-31',
    description: 'Pedestrian overpass and grade separation project at the Great East Road intersection.',
    progress: 23, createdAt: '2023-09-01T08:00:00Z',
  },
]

let demoMilestones: Milestone[] = [
  { id: 'm1', projectId: '1', title: 'Site Clearance Complete', dueDate: '2023-04-15', completedAt: '2023-04-14T10:00:00Z' },
  { id: 'm2', projectId: '1', title: 'Foundation Pour — Block A', dueDate: '2023-07-31', completedAt: '2023-07-28T14:00:00Z' },
  { id: 'm3', projectId: '1', title: 'Structural Steelwork', dueDate: '2023-11-30', completedAt: '2023-11-25T09:00:00Z' },
  { id: 'm4', projectId: '1', title: 'Roofing & Waterproofing', dueDate: '2024-02-28', completedAt: null },
  { id: 'm5', projectId: '1', title: 'Interior Fit-out', dueDate: '2024-05-15', completedAt: null },
  { id: 'm6', projectId: '1', title: 'Final Handover', dueDate: '2024-06-30', completedAt: null },

  { id: 'm7', projectId: '2', title: 'Demolition & Shoring', dueDate: '2023-08-31', completedAt: '2023-08-30T12:00:00Z' },
  { id: 'm8', projectId: '2', title: 'Core & Slab — Level 1–3', dueDate: '2023-12-15', completedAt: '2024-01-05T08:00:00Z' },
  { id: 'm9', projectId: '2', title: 'Core & Slab — Level 4–6', dueDate: '2024-04-30', completedAt: null },
  { id: 'm10', projectId: '2', title: 'Façade Installation', dueDate: '2024-09-30', completedAt: null },

  { id: 'm11', projectId: '3', title: 'Earthworks Complete', dueDate: '2023-03-31', completedAt: '2023-03-28T11:00:00Z' },
  { id: 'm12', projectId: '3', title: 'Structural Frame Erected', dueDate: '2023-06-30', completedAt: '2023-06-25T15:00:00Z' },
  { id: 'm13', projectId: '3', title: 'Roofing & Cladding', dueDate: '2023-09-30', completedAt: '2023-09-28T13:00:00Z' },
  { id: 'm14', projectId: '3', title: 'MEP Installation', dueDate: '2023-11-30', completedAt: '2023-11-20T10:00:00Z' },
  { id: 'm15', projectId: '3', title: 'Commissioning & Handover', dueDate: '2023-12-31', completedAt: null },

  { id: 'm16', projectId: '5', title: 'Survey & Design Approval', dueDate: '2023-10-15', completedAt: '2023-10-14T09:00:00Z' },
  { id: 'm17', projectId: '5', title: 'Piling Works', dueDate: '2023-12-31', completedAt: null },
]

let nextId = 100

// ── Helper ─────────────────────────────────────────────────────────────────

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

function recalcProgress(projectId: string) {
  const ms = demoMilestones.filter(m => m.projectId === projectId)
  if (ms.length === 0) return
  const done = ms.filter(m => m.completedAt !== null).length
  const pct = Math.round((done / ms.length) * 100)
  demoProjects = demoProjects.map(p => p.id === projectId ? { ...p, progress: pct } : p)
}

// ── Projects ───────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  if (DEMO) return [...demoProjects]
  const raw = await api<ApiProject[]>('/projects')
  return raw.map(toProject)
}

export async function getProject(id: string): Promise<Project> {
  if (DEMO) {
    const p = demoProjects.find(p => p.id === id)
    if (!p) throw new Error('Project not found')
    return { ...p }
  }
  const raw = await api<ApiProject>(`/projects/${id}`)
  return toProject(raw)
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  if (DEMO) {
    const p: Project = { ...data, id: String(nextId++), companyId: '1', progress: 0, createdAt: new Date().toISOString() }
    demoProjects = [...demoProjects, p]
    return p
  }
  const raw = await api<ApiProject>('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      location: data.location,
      status: data.status,
      budget: data.budget,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      description: data.description,
    }),
  })
  return toProject(raw)
}

export async function updateProject(id: string, data: CreateProjectData): Promise<Project> {
  if (DEMO) {
    demoProjects = demoProjects.map(p => p.id === id ? { ...p, ...data } : p)
    return getProject(id)
  }
  const raw = await api<ApiProject>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: data.name,
      location: data.location,
      status: data.status,
      budget: data.budget,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      description: data.description,
    }),
  })
  return toProject(raw)
}

export async function deleteProject(id: string): Promise<void> {
  if (DEMO) {
    demoProjects = demoProjects.filter(p => p.id !== id)
    demoMilestones = demoMilestones.filter(m => m.projectId !== id)
    return
  }
  return api<void>(`/projects/${id}`, { method: 'DELETE' })
}

// ── Milestones ─────────────────────────────────────────────────────────────

export async function getMilestones(projectId: string): Promise<Milestone[]> {
  if (DEMO) return demoMilestones.filter(m => m.projectId === projectId)
  const raw = await api<ApiMilestone[]>(`/projects/${projectId}/milestones`)
  return raw.map(toMilestone)
}

export async function createMilestone(projectId: string, data: CreateMilestoneData): Promise<Milestone> {
  if (DEMO) {
    const m: Milestone = { ...data, id: String(nextId++), projectId, completedAt: null }
    demoMilestones = [...demoMilestones, m]
    recalcProgress(projectId)
    return m
  }
  const raw = await api<ApiMilestone>(`/projects/${projectId}/milestones`, {
    method: 'POST',
    body: JSON.stringify({ title: data.title, due_date: data.dueDate || null }),
  })
  return toMilestone(raw)
}

export async function completeMilestone(milestoneId: string, projectId: string): Promise<Milestone> {
  if (DEMO) {
    demoMilestones = demoMilestones.map(m =>
      m.id === milestoneId ? { ...m, completedAt: new Date().toISOString() } : m
    )
    recalcProgress(projectId)
    return demoMilestones.find(m => m.id === milestoneId)!
  }
  const raw = await api<ApiMilestone>(`/projects/milestones/${milestoneId}/complete`, { method: 'PATCH' })
  return toMilestone(raw)
}

export async function deleteMilestone(milestoneId: string, projectId: string): Promise<void> {
  if (DEMO) {
    demoMilestones = demoMilestones.filter(m => m.id !== milestoneId)
    recalcProgress(projectId)
    return
  }
  return api<void>(`/projects/milestones/${milestoneId}`, { method: 'DELETE' })
}

export async function getUpcomingMilestones(limit = 5): Promise<MilestoneWithProject[]> {
  if (DEMO) {
    return demoMilestones
      .filter(m => m.completedAt === null)
      .sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
      .slice(0, limit)
      .map(m => ({
        ...m,
        projectName: demoProjects.find(p => p.id === m.projectId)?.name ?? 'Unknown',
      }))
  }
  const raw = await api<ApiMilestoneWithProject[]>(`/projects/milestones/upcoming?limit=${limit}`)
  return raw.map(toMilestoneWithProject)
}
