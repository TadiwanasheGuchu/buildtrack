export type PunchStatus = 'Open' | 'In Progress' | 'Resolved'
export type PunchPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export const PUNCH_STATUSES: PunchStatus[] = ['Open', 'In Progress', 'Resolved']
export const PUNCH_PRIORITIES: PunchPriority[] = ['Low', 'Medium', 'High', 'Critical']

export interface PunchItem {
  id: string
  companyId: string
  projectId: string
  title: string
  description: string | null
  status: PunchStatus
  priority: PunchPriority
  assignedToId: string | null
  assignedToName: string | null
  dueDate: string | null
  resolvedAt: string | null
  createdById: string
  createdByName: string
  createdAt: string
}

export interface CreatePunchItemData {
  title: string
  description?: string
  priority: PunchPriority
  status: PunchStatus
  assignedToId?: string
  dueDate?: string
}

export interface PunchSummary {
  total: number
  open: number
  inProgress: number
  resolved: number
}
