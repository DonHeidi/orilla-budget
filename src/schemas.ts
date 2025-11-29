import { z } from 'zod'

// System role schema - for platform administrators
export const systemRoleSchema = z.enum(['super_admin', 'admin'])
export type SystemRole = z.infer<typeof systemRoleSchema>

// Project role schema - for project-scoped access
export const projectRoleSchema = z.enum([
  'owner',
  'expert',
  'reviewer',
  'client',
  'viewer',
])
export type ProjectRole = z.infer<typeof projectRoleSchema>

// PII Schema - GDPR compliant personal data
export const piiSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createPiiSchema = piiSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type Pii = z.infer<typeof piiSchema>
export type CreatePii = z.infer<typeof createPiiSchema>

// User Schema - unified identity model
export const userSchema = z.object({
  id: z.string(),
  piiId: z.string().nullable().optional(),
  handle: z
    .string()
    .min(1, 'Handle is required')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Handle can only contain letters, numbers, underscores, and hyphens'
    ),
  email: z.string().email('Invalid email address'),
  passwordHash: z.string().nullable().optional(),
  role: systemRoleSchema.nullable().optional(),
  isActive: z.boolean().default(true),
  lastLoginAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
})

// Session Schema
export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
})

export const createSessionSchema = sessionSchema.omit({
  id: true,
  createdAt: true,
})

export type Session = z.infer<typeof sessionSchema>
export type CreateSession = z.infer<typeof createSessionSchema>

// Project Member Schema - project-scoped access control
export const projectMemberSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  role: projectRoleSchema,
  createdAt: z.string().datetime(),
})

export const createProjectMemberSchema = projectMemberSchema.omit({
  id: true,
  createdAt: true,
})

export type ProjectMember = z.infer<typeof projectMemberSchema>
export type CreateProjectMember = z.infer<typeof createProjectMemberSchema>

// Login Schema - for authentication form
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginCredentials = z.infer<typeof loginSchema>

// Registration Schema - for new user signup
export const registrationSchema = z
  .object({
    handle: z
      .string()
      .min(3, 'Handle must be at least 3 characters')
      .max(30, 'Handle must be at most 30 characters')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Handle can only contain letters, numbers, underscores, and hyphens'
      ),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    name: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegistrationData = z.infer<typeof registrationSchema>

// Organisation Schema
export const organisationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Organisation name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  createdAt: z.string().datetime(),
})

export const createOrganisationSchema = organisationSchema.omit({
  id: true,
  createdAt: true,
})

// Account Schema
export const accountSchema = z.object({
  id: z.string(),
  userId: z.string().optional().nullable(),
  organisationId: z.string(),
  name: z.string().min(1, 'Account name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['contact', 'project_manager', 'finance']).default('contact'),
  accessCode: z.string(),
  createdAt: z.string().datetime(),
})

export const createAccountSchema = accountSchema.omit({
  id: true,
  accessCode: true,
  createdAt: true,
})

// Project Schema
export const projectSchema = z
  .object({
    id: z.string(),
    organisationId: z.string().optional(),
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional().default(''),
    category: z.enum(['budget', 'fixed']).default('budget'),
    budgetHours: z
      .number()
      .positive('Budget must be a positive number')
      .nullable()
      .optional(),
    createdAt: z.string().datetime(),
  })
  .superRefine((data, ctx) => {
    // Budget (T&M) projects must have budgetHours
    if (data.category === 'budget' && !data.budgetHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Budget is required for Time & Materials projects',
        path: ['budgetHours'],
      })
    }
    // Fixed price projects should NOT have budgetHours
    if (data.category === 'fixed' && data.budgetHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fixed price projects should not have hourly budgets',
        path: ['budgetHours'],
      })
    }
  })

export const createProjectSchema = projectSchema.omit({
  id: true,
  createdAt: true,
})

// Time Entry Schema - Very flexible for smooth UX
export const timeEntrySchema = z.object({
  id: z.string(),
  createdByUserId: z.string().nullable().optional(),
  projectId: z.string().optional(),
  organisationId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  hours: z.number().positive('Hours must be a positive number'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  approvedDate: z.string().datetime().optional(),
  billed: z.boolean().default(false),
  createdAt: z.string().datetime(),
})

export const createTimeEntrySchema = timeEntrySchema.omit({
  id: true,
  createdAt: true,
})

// Quick Time Entry Schema (for the quick entry form) - Only title and hours required
export const quickTimeEntrySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  hours: z.number().positive('Hours must be a positive number'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  description: z
    .string()
    .transform((val) => val || '')
    .optional()
    .default(''),
  organisationId: z
    .string()
    .transform((val) => val || undefined)
    .optional(),
  projectId: z
    .string()
    .transform((val) => val || undefined)
    .optional(),
})

// Time Sheet Schema
export const timeSheetSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().default(''),
    startDate: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
        .optional()
    ),
    endDate: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
        .optional()
    ),
    status: z
      .enum(['draft', 'submitted', 'approved', 'rejected'])
      .default('draft'),
    submittedDate: z.string().datetime().optional(),
    approvedDate: z.string().datetime().optional(),
    rejectedDate: z.string().datetime().optional(),
    rejectionReason: z.string().optional(),
    organisationId: z.string().optional(),
    projectId: z.string().optional(),
    accountId: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((data, ctx) => {
    // Validate date range if both dates are provided
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
        path: ['endDate'],
      })
    }
  })

export const createTimeSheetSchema = timeSheetSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    submittedDate: true,
    approvedDate: true,
    rejectedDate: true,
  })
  .extend({
    organisationId: z.string().min(1, 'Organisation is required'),
  })

export const updateTimeSheetSchema = timeSheetSchema
  .partial()
  .required({ id: true })

// Time Sheet Entry Schema (junction table)
export const timeSheetEntrySchema = z.object({
  id: z.string(),
  timeSheetId: z.string(),
  timeEntryId: z.string(),
  createdAt: z.string().datetime(),
})

// Type exports
export type User = z.infer<typeof userSchema>
export type CreateUser = z.infer<typeof createUserSchema>
// Note: Pii, CreatePii, Session, CreateSession, ProjectMember, CreateProjectMember,
// LoginCredentials, and RegistrationData types are exported with their schemas above
export type Organisation = z.infer<typeof organisationSchema>
export type CreateOrganisation = z.infer<typeof createOrganisationSchema>
export type Account = z.infer<typeof accountSchema>
export type CreateAccount = z.infer<typeof createAccountSchema>
export type Project = z.infer<typeof projectSchema>
export type CreateProject = z.infer<typeof createProjectSchema>
export type TimeEntry = z.infer<typeof timeEntrySchema>
export type CreateTimeEntry = z.infer<typeof createTimeEntrySchema>
export type QuickTimeEntry = z.infer<typeof quickTimeEntrySchema>
export type TimeSheet = z.infer<typeof timeSheetSchema>
export type CreateTimeSheet = z.infer<typeof createTimeSheetSchema>
export type UpdateTimeSheet = z.infer<typeof updateTimeSheetSchema>
export type TimeSheetEntry = z.infer<typeof timeSheetEntrySchema>

// Add entries to sheet schema
export const addEntriesToSheetSchema = z.object({
  sheetId: z.string().min(1, 'Sheet ID is required'),
  entryIds: z.array(z.string()).min(1, 'At least one entry is required'),
})

// Contact Schema - personal address book
export const contactSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  userId: z.string().nullable().optional(), // If contact has an account
  piiId: z.string().nullable().optional(), // Only if NOT linked to user
  email: z.string().email('Invalid email address'),
  organisationId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
})

export const createContactSchema = contactSchema.omit({
  id: true,
  createdAt: true,
  userId: true, // Set automatically when contact creates account
  piiId: true, // Set automatically when PII is created
})

export type Contact = z.infer<typeof contactSchema>
export type CreateContact = z.infer<typeof createContactSchema>

// Invitation status schema
export const invitationStatusSchema = z.enum(['pending', 'accepted', 'expired'])
export type InvitationStatus = z.infer<typeof invitationStatusSchema>

// Invitation Schema - project invitations
export const invitationSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  invitedByUserId: z.string(),
  projectId: z.string().nullable().optional(), // Optional: invite to specific project
  role: projectRoleSchema.nullable().optional(), // Role to assign when accepted
  code: z.string(),
  expiresAt: z.string().datetime(),
  status: invitationStatusSchema.default('pending'),
  createdAt: z.string().datetime(),
})

export const createInvitationSchema = z.object({
  contactId: z.string(),
  projectId: z.string().optional(), // Optional: invite to specific project
  role: projectRoleSchema.optional(), // Role to assign when accepted
})

export type Invitation = z.infer<typeof invitationSchema>
export type CreateInvitation = z.infer<typeof createInvitationSchema>

// Auth session types - for authenticated user context
export interface AuthenticatedUser {
  id: string
  handle: string
  email: string
  role: SystemRole | null
  isActive: boolean
}

export interface ProjectMembership {
  projectId: string
  projectName: string
  role: ProjectRole
}

export interface AuthSession {
  user: AuthenticatedUser
  projectMemberships: ProjectMembership[]
}
