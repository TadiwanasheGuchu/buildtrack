import type { UserRole } from './auth'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  createdAt: string
}

export interface InviteOut {
  id: string
  email: string
  role: string
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

export interface InviteInfo {
  email: string
  role: string
  companyName: string
  expiresAt: string
}

export type InviteRole = 'site_manager' | 'worker' | 'client'
