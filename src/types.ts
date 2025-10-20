// Re-export Zod-inferred types from schemas (single source of truth)
export type {
  Organisation,
  CreateOrganisation,
  Account,
  CreateAccount,
  Project,
  CreateProject,
  TimeEntry,
  CreateTimeEntry,
  QuickTimeEntry,
} from '@/schemas'

// View models (no corresponding Zod schemas)
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
