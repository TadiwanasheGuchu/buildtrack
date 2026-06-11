export interface ProjectReportRow {
  id: string
  name: string
  status: string
  progress: number
  budget: number
  spent: number
  percentUsed: number
  milestonesTotal: number
  milestonesCompleted: number
  punchOpen: number
}

export interface PortfolioReport {
  projectsTotal: number
  projectsByStatus: Record<string, number>
  totalBudget: number
  totalSpent: number
  budgetPercentUsed: number
  milestonesTotal: number
  milestonesCompleted: number
  milestonesOverdue: number
  onTimeRate: number | null
  punchOpen: number
  punchResolved: number
  projects: ProjectReportRow[]
}

export type ProjectCsvReport = 'milestones' | 'cost-entries' | 'punch' | 'site-logs'

export const PROJECT_CSV_REPORTS: { value: ProjectCsvReport; label: string }[] = [
  { value: 'milestones', label: 'Milestones' },
  { value: 'cost-entries', label: 'Cost entries' },
  { value: 'punch', label: 'Punch list' },
  { value: 'site-logs', label: 'Site logs' },
]
