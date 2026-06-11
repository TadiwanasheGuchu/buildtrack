export const BUDGET_CATEGORIES = ['Labour', 'Materials', 'Equipment', 'Subcontractors', 'Permits & Fees', 'Other'] as const
export type BudgetCategory = typeof BUDGET_CATEGORIES[number]

export interface CategorySummary {
  category: BudgetCategory
  allocated: number
  spent: number
  remaining: number
}

export interface BudgetSummary {
  totalBudget: number
  totalSpent: number
  remaining: number
  percentUsed: number
  categories: CategorySummary[]
}

export interface CompanyBudgetSummary {
  totalBudget: number
  totalSpent: number
  remaining: number
  percentUsed: number
}

export interface CostEntry {
  id: string
  companyId: string
  projectId: string
  category: BudgetCategory
  description: string
  amount: number
  vendor: string | null
  date: string
  createdById: string
  createdByName: string
  createdAt: string
}

export interface CreateCostEntryData {
  category: BudgetCategory
  description: string
  amount: number
  vendor?: string
  date: string
}

export interface BudgetLineIn {
  category: BudgetCategory
  allocatedAmount: number
}
