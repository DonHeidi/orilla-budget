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
  TimeSheet,
  CreateTimeSheet,
  UpdateTimeSheet,
  TimeSheetEntry,
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

export interface TimeSheetWithEntries {
  timeSheet: TimeSheet
  entries: TimeEntry[]
  totalHours: number
  organisation?: Organisation
  project?: Project
}

export interface TimeSheetSummary {
  id: string
  title: string
  description: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  startDate?: string
  endDate?: string
  entryCount: number
  totalHours: number
  organisationName?: string
  projectName?: string
  createdAt: string
  updatedAt: string
}
