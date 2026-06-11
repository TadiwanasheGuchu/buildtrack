export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Delayed'

export interface Project {
  id: string
  companyId: string
  name: string
  location: string
  status: ProjectStatus
  budget: number
  startDate: string   // ISO date string YYYY-MM-DD
  endDate: string
  description: string
  progress: number    // 0–100
  createdAt: string
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  dueDate: string     // ISO date string
  completedAt: string | null
}

export interface CreateProjectData {
  name: string
  location: string
  status: ProjectStatus
  budget: number
  startDate: string
  endDate: string
  description: string
}

export interface CreateMilestoneData {
  title: string
  dueDate: string
}

export interface MilestoneWithProject extends Milestone {
  projectName: string
}
