import type { AuthResponse, UserRole } from '@/types/auth'
import type { InviteInfo, InviteOut, InviteRole, TeamMember } from '@/types/team'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Raw API shapes ─────────────────────────────────────────────────────────

interface ApiAuthUser {
  id: string; name: string; email: string; role: string
  company_id: string; company_name: string; avatar_url?: string
}
interface ApiAuthResponse {
  access_token: string; refresh_token: string; token_type: string; user: ApiAuthUser
}

interface ApiTeamMember {
  id: string
  name: string
  email: string
  role: string
  avatar_url?: string
  created_at: string
}

interface ApiInviteOut {
  id: string
  email: string
  role: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

interface ApiInviteInfo {
  email: string
  role: string
  company_name: string
  expires_at: string
}

function toMember(r: ApiTeamMember): TeamMember {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role as UserRole,
    avatarUrl: r.avatar_url,
    createdAt: r.created_at,
  }
}

function toInviteOut(r: ApiInviteOut): InviteOut {
  return {
    id: r.id,
    email: r.email,
    role: r.role,
    expiresAt: r.expires_at,
    acceptedAt: r.accepted_at,
    createdAt: r.created_at,
  }
}

function toInviteInfo(r: ApiInviteInfo): InviteInfo {
  return {
    email: r.email,
    role: r.role,
    companyName: r.company_name,
    expiresAt: r.expires_at,
  }
}

// ── Demo seed data ─────────────────────────────────────────────────────────

let demoMembers: TeamMember[] = [
  { id: '1', name: 'Thabo Nkosi', email: 'thabo@terracontruct.co.za', role: 'owner', createdAt: '2023-01-01T08:00:00Z' },
  { id: '2', name: 'Amara Diallo', email: 'amara@terracontruct.co.za', role: 'site_manager', createdAt: '2023-03-15T08:00:00Z' },
  { id: '3', name: 'Kemi Adeola', email: 'kemi@terracontruct.co.za', role: 'worker', createdAt: '2023-06-20T08:00:00Z' },
]

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

// ── Members ────────────────────────────────────────────────────────────────

export async function getTeamMembers(): Promise<TeamMember[]> {
  if (DEMO) return [...demoMembers]
  const raw = await api<ApiTeamMember[]>('/team/members')
  return raw.map(toMember)
}

export async function changeMemberRole(userId: string, role: UserRole): Promise<TeamMember> {
  if (DEMO) {
    demoMembers = demoMembers.map(m => m.id === userId ? { ...m, role } : m)
    return demoMembers.find(m => m.id === userId)!
  }
  const raw = await api<ApiTeamMember>(`/team/members/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
  return toMember(raw)
}

export async function removeMember(userId: string): Promise<void> {
  if (DEMO) {
    demoMembers = demoMembers.filter(m => m.id !== userId)
    return
  }
  return api<void>(`/team/members/${userId}`, { method: 'DELETE' })
}

// ── Invitations ────────────────────────────────────────────────────────────

export async function inviteMember(email: string, role: InviteRole): Promise<InviteOut> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 600))
    return {
      id: String(Date.now()),
      email,
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      acceptedAt: null,
      createdAt: new Date().toISOString(),
    }
  }
  const raw = await api<ApiInviteOut>('/team/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  })
  return toInviteOut(raw)
}

export async function getInviteInfo(token: string): Promise<InviteInfo> {
  const res = await fetch(`${BASE}/team/invite/${token}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? 'Invalid invitation')
  }
  const raw: ApiInviteInfo = await res.json()
  return toInviteInfo(raw)
}

export async function acceptInvite(token: string, name: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/team/invite/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, name, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? 'Failed to accept invitation')
  }
  const raw: ApiAuthResponse = await res.json()
  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    token_type: raw.token_type,
    user: {
      id: raw.user.id,
      name: raw.user.name,
      email: raw.user.email,
      role: raw.user.role as UserRole,
      companyId: raw.user.company_id,
      companyName: raw.user.company_name,
      avatarUrl: raw.user.avatar_url,
    },
  }
}
