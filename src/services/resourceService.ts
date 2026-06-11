import type {
  Equipment, Material, Vehicle,
  CreateEquipmentData, CreateMaterialData, CreateVehicleData,
} from '@/types/resource'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes ─────────────────────────────────────────────────────────

interface ApiEquipment {
  id: string; company_id: string; name: string; category: string; status: string
  project_id: string | null; project_name: string | null; notes: string | null; created_at: string
}
interface ApiMaterial {
  id: string; company_id: string; project_id: string | null; project_name: string | null
  name: string; unit: string; quantity: number; created_at: string
}
interface ApiVehicle {
  id: string; company_id: string; name: string; plate_number: string; driver_name: string | null
  project_id: string | null; project_name: string | null; created_at: string
}

function toEquipment(r: ApiEquipment): Equipment {
  return {
    id: r.id, companyId: r.company_id, name: r.name, category: r.category,
    status: r.status as Equipment['status'], projectId: r.project_id,
    projectName: r.project_name, notes: r.notes, createdAt: r.created_at,
  }
}
function toMaterial(r: ApiMaterial): Material {
  return {
    id: r.id, companyId: r.company_id, projectId: r.project_id, projectName: r.project_name,
    name: r.name, unit: r.unit, quantity: Number(r.quantity), createdAt: r.created_at,
  }
}
function toVehicle(r: ApiVehicle): Vehicle {
  return {
    id: r.id, companyId: r.company_id, name: r.name, plateNumber: r.plate_number,
    driverName: r.driver_name, projectId: r.project_id, projectName: r.project_name,
    createdAt: r.created_at,
  }
}

// ── Demo data ──────────────────────────────────────────────────────────────

let demoEquipment: Equipment[] = [
  { id: 'eq1', companyId: '1', name: 'Caterpillar 320 Excavator', category: 'Heavy Machinery', status: 'In Use', projectId: '1', projectName: 'Southern Ridge Residential', notes: 'Service due Oct 2026', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'eq2', companyId: '1', name: 'Tower Crane TC-7200', category: 'Heavy Machinery', status: 'In Use', projectId: '2', projectName: 'Harare High-Rise Extension', notes: null, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: 'eq3', companyId: '1', name: 'Concrete Mixer CM-350L', category: 'Tools', status: 'Available', projectId: null, projectName: null, notes: null, createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: 'eq4', companyId: '1', name: 'Mobile Scaffolding Set A', category: 'Scaffolding', status: 'Maintenance', projectId: null, projectName: null, notes: 'Awaiting replacement parts', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'eq5', companyId: '1', name: 'Generator 50kVA', category: 'Electrical', status: 'In Use', projectId: '3', projectName: 'Cape Town Logistics Hub', notes: null, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
]

let demoMaterials: Material[] = [
  { id: 'mat1', companyId: '1', projectId: '1', projectName: 'Southern Ridge Residential', name: 'Portland Cement (42.5N)', unit: 'bags', quantity: 850, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: 'mat2', companyId: '1', projectId: '2', projectName: 'Harare High-Rise Extension', name: 'Structural Steel (H-Beam)', unit: 'tonnes', quantity: 42.5, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'mat3', companyId: '1', projectId: '1', projectName: 'Southern Ridge Residential', name: 'River Sand', unit: 'm³', quantity: 120, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'mat4', companyId: '1', projectId: '3', projectName: 'Cape Town Logistics Hub', name: 'Roof Sheeting (IBR)', unit: 'sheets', quantity: 340, createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
]

let demoVehicles: Vehicle[] = [
  { id: 'veh1', companyId: '1', name: 'Hino 300 Flatbed', plateNumber: 'GP 42 SD FK', driverName: 'Sipho Dlamini', projectId: '1', projectName: 'Southern Ridge Residential', createdAt: new Date(Date.now() - 9 * 86400000).toISOString() },
  { id: 'veh2', companyId: '1', name: 'Isuzu NPS 4x4', plateNumber: 'CA 89 TK LM', driverName: 'Amos Banda', projectId: '3', projectName: 'Cape Town Logistics Hub', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: 'veh3', companyId: '1', name: 'Toyota Land Cruiser 79', plateNumber: 'ZW 115 ADB', driverName: null, projectId: null, projectName: null, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
]

let nextId = 500

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

// ── Equipment ──────────────────────────────────────────────────────────────

export async function getEquipment(projectId?: string): Promise<Equipment[]> {
  if (DEMO) {
    return projectId ? demoEquipment.filter(e => e.projectId === projectId) : [...demoEquipment]
  }
  const params = projectId ? `?project_id=${projectId}` : ''
  const raw = await api<ApiEquipment[]>(`/resources/equipment${params}`)
  return raw.map(toEquipment)
}

export async function createEquipment(data: CreateEquipmentData): Promise<Equipment> {
  if (DEMO) {
    const item: Equipment = { id: String(nextId++), companyId: '1', ...data, createdAt: new Date().toISOString(), projectName: null }
    demoEquipment = [item, ...demoEquipment]
    return item
  }
  const raw = await api<ApiEquipment>('/resources/equipment', {
    method: 'POST',
    body: JSON.stringify({ name: data.name, category: data.category, status: data.status, project_id: data.projectId ?? null, notes: data.notes ?? null }),
  })
  return toEquipment(raw)
}

export async function updateEquipment(id: string, data: CreateEquipmentData): Promise<Equipment> {
  if (DEMO) {
    demoEquipment = demoEquipment.map(e => e.id === id ? { ...e, ...data } : e)
    return demoEquipment.find(e => e.id === id)!
  }
  const raw = await api<ApiEquipment>(`/resources/equipment/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: data.name, category: data.category, status: data.status, project_id: data.projectId ?? null, notes: data.notes ?? null }),
  })
  return toEquipment(raw)
}

export async function deleteEquipment(id: string): Promise<void> {
  if (DEMO) { demoEquipment = demoEquipment.filter(e => e.id !== id); return }
  return api<void>(`/resources/equipment/${id}`, { method: 'DELETE' })
}

// ── Materials ──────────────────────────────────────────────────────────────

export async function getMaterials(projectId?: string): Promise<Material[]> {
  if (DEMO) {
    return projectId ? demoMaterials.filter(m => m.projectId === projectId) : [...demoMaterials]
  }
  const params = projectId ? `?project_id=${projectId}` : ''
  const raw = await api<ApiMaterial[]>(`/resources/materials${params}`)
  return raw.map(toMaterial)
}

export async function createMaterial(data: CreateMaterialData): Promise<Material> {
  if (DEMO) {
    const item: Material = { id: String(nextId++), companyId: '1', ...data, projectName: null, createdAt: new Date().toISOString() }
    demoMaterials = [item, ...demoMaterials]
    return item
  }
  const raw = await api<ApiMaterial>('/resources/materials', {
    method: 'POST',
    body: JSON.stringify({ name: data.name, unit: data.unit, quantity: data.quantity, project_id: data.projectId ?? null }),
  })
  return toMaterial(raw)
}

export async function updateMaterial(id: string, data: CreateMaterialData): Promise<Material> {
  if (DEMO) {
    demoMaterials = demoMaterials.map(m => m.id === id ? { ...m, ...data } : m)
    return demoMaterials.find(m => m.id === id)!
  }
  const raw = await api<ApiMaterial>(`/resources/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: data.name, unit: data.unit, quantity: data.quantity, project_id: data.projectId ?? null }),
  })
  return toMaterial(raw)
}

export async function deleteMaterial(id: string): Promise<void> {
  if (DEMO) { demoMaterials = demoMaterials.filter(m => m.id !== id); return }
  return api<void>(`/resources/materials/${id}`, { method: 'DELETE' })
}

// ── Vehicles ───────────────────────────────────────────────────────────────

export async function getVehicles(projectId?: string): Promise<Vehicle[]> {
  if (DEMO) {
    return projectId ? demoVehicles.filter(v => v.projectId === projectId) : [...demoVehicles]
  }
  const params = projectId ? `?project_id=${projectId}` : ''
  const raw = await api<ApiVehicle[]>(`/resources/vehicles${params}`)
  return raw.map(toVehicle)
}

export async function createVehicle(data: CreateVehicleData): Promise<Vehicle> {
  if (DEMO) {
    const item: Vehicle = { id: String(nextId++), companyId: '1', ...data, projectName: null, createdAt: new Date().toISOString() }
    demoVehicles = [item, ...demoVehicles]
    return item
  }
  const raw = await api<ApiVehicle>('/resources/vehicles', {
    method: 'POST',
    body: JSON.stringify({ name: data.name, plate_number: data.plateNumber, driver_name: data.driverName ?? null, project_id: data.projectId ?? null }),
  })
  return toVehicle(raw)
}

export async function updateVehicle(id: string, data: CreateVehicleData): Promise<Vehicle> {
  if (DEMO) {
    demoVehicles = demoVehicles.map(v => v.id === id ? { ...v, ...data } : v)
    return demoVehicles.find(v => v.id === id)!
  }
  const raw = await api<ApiVehicle>(`/resources/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: data.name, plate_number: data.plateNumber, driver_name: data.driverName ?? null, project_id: data.projectId ?? null }),
  })
  return toVehicle(raw)
}

export async function deleteVehicle(id: string): Promise<void> {
  if (DEMO) { demoVehicles = demoVehicles.filter(v => v.id !== id); return }
  return api<void>(`/resources/vehicles/${id}`, { method: 'DELETE' })
}
