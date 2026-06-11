import type { AuthResponse, LoginRequest, RegisterRequest, User, UserRole } from '@/types/auth'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// Raw shape returned by the backend (snake_case)
interface ApiUser {
  id: string
  name: string
  email: string
  role: UserRole
  company_id: string
  company_name: string
  avatar_url?: string
}

interface ApiAuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: ApiUser
}

function toUser(raw: ApiUser): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    companyId: raw.company_id,
    companyName: raw.company_name,
    avatarUrl: raw.avatar_url,
  }
}

function toAuthResponse(raw: ApiAuthResponse): AuthResponse {
  return { ...raw, user: toUser(raw.user) }
}

const DEMO_USER: User = {
  id: '1',
  name: 'Thabo Nkosi',
  email: 'thabo@terracontruct.co.za',
  role: 'owner',
  companyId: '1',
  companyName: 'TerraConstruct',
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function loginApi(data: LoginRequest): Promise<AuthResponse> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 600))
    if (data.password.length < 1) throw new Error('Password is required')
    return { access_token: 'demo-token', refresh_token: 'demo-refresh', token_type: 'bearer', user: { ...DEMO_USER, email: data.email } }
  }
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = await handleResponse<ApiAuthResponse>(res)
  return toAuthResponse(raw)
}

export async function registerApi(data: RegisterRequest): Promise<AuthResponse> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 800))
    return {
      access_token: 'demo-token',
      refresh_token: 'demo-refresh',
      token_type: 'bearer',
      user: { ...DEMO_USER, name: data.name, email: data.email, companyName: data.companyName },
    }
  }
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: data.companyName,
      name: data.name,
      email: data.email,
      password: data.password,
    }),
  })
  const raw = await handleResponse<ApiAuthResponse>(res)
  return toAuthResponse(raw)
}

export async function getMeApi(): Promise<User> {
  if (DEMO) return DEMO_USER
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() })
  const raw = await handleResponse<ApiUser>(res)
  return toUser(raw)
}

export async function refreshTokenApi(refreshToken: string): Promise<AuthResponse> {
  if (DEMO) return { access_token: 'demo-token', refresh_token: 'demo-refresh', token_type: 'bearer', user: DEMO_USER }
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const raw = await handleResponse<ApiAuthResponse>(res)
  return toAuthResponse(raw)
}

export async function logoutApi(): Promise<void> {
  if (DEMO) return
  const res = await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: authHeaders() })
  await handleResponse<void>(res)
}

export async function forgotPasswordApi(email: string): Promise<void> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 600))
    return
  }
  const res = await fetch(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return handleResponse<void>(res)
}

export async function updateMeApi(name: string): Promise<User> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 400))
    return { ...DEMO_USER, name }
  }
  const res = await fetch(`${BASE}/auth/me`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  })
  const raw = await handleResponse<ApiUser>(res)
  return toUser(raw)
}

export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<void> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 400))
    return
  }
  const res = await fetch(`${BASE}/auth/me/password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
  return handleResponse<void>(res)
}

export async function uploadAvatarApi(file: File): Promise<User> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 600))
    return { ...DEMO_USER, avatarUrl: URL.createObjectURL(file) }
  }
  const token = localStorage.getItem('access_token')
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/auth/me/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const raw = await handleResponse<ApiUser>(res)
  return toUser(raw)
}

export async function renameCompanyApi(name: string): Promise<void> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 400))
    return
  }
  const res = await fetch(`${BASE}/team/company`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  })
  await handleResponse<unknown>(res)
}

export async function resetPasswordApi(token: string, password: string): Promise<void> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 600))
    return
  }
  const res = await fetch(`${BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
  return handleResponse<void>(res)
}
