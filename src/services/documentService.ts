import type { ProjectDocument, CreateDocumentData, UploadResult } from '@/types/document'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes ─────────────────────────────────────────────────────────

interface ApiDocument {
  id: string; company_id: string; project_id: string; name: string
  file_url: string; file_type: string; file_size: number; category: string
  uploaded_by_id: string; uploaded_by_name: string; created_at: string
}

function toDoc(r: ApiDocument): ProjectDocument {
  return {
    id: r.id, companyId: r.company_id, projectId: r.project_id,
    name: r.name, fileUrl: r.file_url, fileType: r.file_type,
    fileSize: r.file_size, category: r.category as ProjectDocument['category'],
    uploadedById: r.uploaded_by_id, uploadedByName: r.uploaded_by_name,
    createdAt: r.created_at,
  }
}

// ── Demo data ──────────────────────────────────────────────────────────────

const NOW = Date.now()
const ts = (daysAgo: number) => new Date(NOW - daysAgo * 86400000).toISOString()

let demoDocs: ProjectDocument[] = [
  { id: 'doc1', companyId: '1', projectId: '1', name: 'Southern Ridge — Architectural Plans Rev 3.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 4_820_000, category: 'Plans & Drawings', uploadedById: 'u1', uploadedByName: 'Admin', createdAt: ts(30) },
  { id: 'doc2', companyId: '1', projectId: '1', name: 'Main Contractor Agreement — Signed.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 1_240_000, category: 'Contracts', uploadedById: 'u1', uploadedByName: 'Admin', createdAt: ts(28) },
  { id: 'doc3', companyId: '1', projectId: '1', name: 'Building Permit — Cape Town Council.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 680_000, category: 'Permits', uploadedById: 'u1', uploadedByName: 'Admin', createdAt: ts(25) },
  { id: 'doc4', companyId: '1', projectId: '1', name: 'Structural Engineering Specifications.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 2_100_000, category: 'Specifications', uploadedById: 'u1', uploadedByName: 'Admin', createdAt: ts(20) },
  { id: 'doc5', companyId: '1', projectId: '1', name: 'Foundation Progress Report — Week 4.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 950_000, category: 'Reports', uploadedById: 'u1', uploadedByName: 'Admin', createdAt: ts(7) },
  { id: 'doc6', companyId: '1', projectId: '2', name: 'Harare High-Rise — Structural Drawings.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 8_400_000, category: 'Plans & Drawings', uploadedById: 'u1', uploadedByName: 'Admin', createdAt: ts(22) },
  { id: 'doc7', companyId: '1', projectId: '2', name: 'Steel Supply Contract — ArcelorMittal.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 1_560_000, category: 'Contracts', uploadedById: 'u1', uploadedByName: 'Admin', createdAt: ts(18) },
  { id: 'doc8', companyId: '1', projectId: '3', name: 'Logistics Hub — Site Layout Plan.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 3_200_000, category: 'Plans & Drawings', uploadedById: 'u1', uploadedByName: 'Admin', createdAt: ts(15) },
  { id: 'doc9', companyId: '1', projectId: '3', name: 'Occupancy Certificate Application.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 520_000, category: 'Permits', uploadedById: 'u1', uploadedByName: 'Admin', createdAt: ts(5) },
]

let nextId = 1000

// ── Helpers ────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function jsonHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Upload ─────────────────────────────────────────────────────────────────

export async function uploadDocument(file: File): Promise<UploadResult> {
  if (DEMO) {
    return { url: '#', fileType: file.type, fileSize: file.size, name: file.name }
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/documents/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Upload failed: ${res.status}`)
  }
  return res.json() as Promise<UploadResult>
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function getDocuments(projectId: string): Promise<ProjectDocument[]> {
  if (DEMO) return demoDocs.filter(d => d.projectId === projectId)
  const raw = await api<ApiDocument[]>(`/documents/projects/${projectId}`, { headers: jsonHeaders() })
  return raw.map(toDoc)
}

export async function createDocument(projectId: string, data: CreateDocumentData): Promise<ProjectDocument> {
  if (DEMO) {
    const doc: ProjectDocument = {
      id: String(nextId++), companyId: '1', projectId,
      ...data, uploadedById: 'u1', uploadedByName: 'Admin', createdAt: new Date().toISOString(),
    }
    demoDocs = [doc, ...demoDocs]
    return doc
  }
  const raw = await api<ApiDocument>(`/documents/projects/${projectId}`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      name: data.name, file_url: data.fileUrl, file_type: data.fileType,
      file_size: data.fileSize, category: data.category,
    }),
  })
  return toDoc(raw)
}

export async function deleteDocument(id: string): Promise<void> {
  if (DEMO) { demoDocs = demoDocs.filter(d => d.id !== id); return }
  return api<void>(`/documents/${id}`, { method: 'DELETE', headers: jsonHeaders() })
}
