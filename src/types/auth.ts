export type UserRole = 'owner' | 'site_manager' | 'worker' | 'client'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  companyId: string
  companyName: string
  avatarUrl?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  companyName: string
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}
