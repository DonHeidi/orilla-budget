export interface Organisation {
  id: string
  name: string // e.g., "Google"
  totalBudgetHours: number
  createdAt: string
}

export interface Account {
  id: string
  organisationId: string
  name: string // e.g., "Larry Page"
  email: string
  accessCode: string // Simple auth for client portal
  createdAt: string
}

export interface Project {
  id: string
  organisationId: string
  name: string
  description: string
  budgetHours: number
  createdAt: string
}

export interface TimeEntry {
  id: string
  projectId?: string
  organisationId?: string
  title: string
  description: string
  hours: number
  date: string
  createdAt: string
}

export interface OrganisationBudgetView {
  organisation: Organisation
  projects: Array<{
    project: Project
    timeEntries: TimeEntry[]
    totalHours: number
  }>
  totalHoursUsed: number
  remainingHours: number
}

export interface AccountBudgetView {
  account: Account
  organisation: Organisation
  projects: Array<{
    project: Project
    timeEntries: TimeEntry[]
    totalHours: number
  }>
  totalHoursUsed: number
  remainingHours: number
}
