import { z } from 'zod'

// Organisation Schema
export const organisationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Organisation name is required'),
  totalBudgetHours: z.number().positive('Budget must be a positive number'),
  createdAt: z.string().datetime(),
})

export const createOrganisationSchema = organisationSchema.omit({ id: true, createdAt: true })

// Account Schema
export const accountSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  name: z.string().min(1, 'Account name is required'),
  email: z.string().email('Invalid email address'),
  accessCode: z.string(),
  createdAt: z.string().datetime(),
})

export const createAccountSchema = accountSchema.omit({ id: true, accessCode: true, createdAt: true })

// Project Schema
export const projectSchema = z.object({
  id: z.string(),
  organisationId: z.string().optional(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional().default(''),
  budgetHours: z.number().positive('Budget must be a positive number').optional(),
  createdAt: z.string().datetime(),
})

export const createProjectSchema = projectSchema.omit({ id: true, createdAt: true })

// Time Entry Schema - Very flexible for smooth UX
export const timeEntrySchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  organisationId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  hours: z.number().positive('Hours must be a positive number'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  createdAt: z.string().datetime(),
})

export const createTimeEntrySchema = timeEntrySchema.omit({ id: true, createdAt: true })

// Quick Time Entry Schema (for the quick entry form) - Only title and hours required
export const quickTimeEntrySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  hours: z.number().positive('Hours must be a positive number'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  description: z.string().transform(val => val || '').optional().default(''),
  organisationId: z.string().transform(val => val || undefined).optional(),
  projectId: z.string().transform(val => val || undefined).optional(),
})

// Type exports
export type Organisation = z.infer<typeof organisationSchema>
export type CreateOrganisation = z.infer<typeof createOrganisationSchema>
export type Account = z.infer<typeof accountSchema>
export type CreateAccount = z.infer<typeof createAccountSchema>
export type Project = z.infer<typeof projectSchema>
export type CreateProject = z.infer<typeof createProjectSchema>
export type TimeEntry = z.infer<typeof timeEntrySchema>
export type CreateTimeEntry = z.infer<typeof createTimeEntrySchema>
export type QuickTimeEntry = z.infer<typeof quickTimeEntrySchema>
