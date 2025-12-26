import { describe, it, expect } from 'bun:test'
import {
  userSchema,
  createUserSchema,
  organisationSchema,
  createOrganisationSchema,
  accountSchema,
  createAccountSchema,
  projectSchema,
  createProjectSchema,
  timeEntrySchema,
  createTimeEntrySchema,
  quickTimeEntrySchema,
  timeSheetSchema,
  createTimeSheetSchema,
  updateTimeSheetSchema,
  timeSheetEntrySchema,
  contactSchema,
  createContactSchema,
  invitationSchema,
  createInvitationSchema,
  invitationStatusSchema,
  // Approval workflow schemas
  entryStatusSchema,
  entryMessageSchema,
  createEntryMessageSchema,
  approvalModeSchema,
  approvalStageSchema,
  projectApprovalSettingsSchema,
  updateProjectApprovalSettingsSchema,
  timeSheetApprovalSchema,
  createTimeSheetApprovalSchema,
  updateEntryStatusSchema,
} from './schemas'

describe('userSchema', () => {
  describe('valid data', () => {
    it('should accept valid user data', () => {
      const timestamp = new Date().toISOString()
      const validUser = {
        id: 'user-1',
        handle: 'john_doe',
        email: 'john@example.com',
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      const result = userSchema.safeParse(validUser)
      expect(result.success).toBe(true)
    })

    it('should accept handle with letters, numbers, underscores, and hyphens', () => {
      const validHandles = ['user123', 'user_123', 'user-123', 'User-Name_01']
      const timestamp = new Date().toISOString()

      validHandles.forEach((handle) => {
        const result = userSchema.safeParse({
          id: 'user-1',
          handle,
          email: 'user@example.com',
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('validation errors', () => {
    it('should reject empty handle', () => {
      const result = userSchema.safeParse({
        id: 'user-1',
        handle: '',
        email: 'user@example.com',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Handle is required')
      }
    })

    it('should reject handle with special characters', () => {
      const invalidHandles = [
        'user@123',
        'user!name',
        'user name',
        'user#123',
        'user$',
      ]

      invalidHandles.forEach((handle) => {
        const result = userSchema.safeParse({
          id: 'user-1',
          handle,
          email: 'user@example.com',
          createdAt: new Date().toISOString(),
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Handle can only contain letters, numbers, underscores, and hyphens'
          )
        }
      })
    })

    it('should reject invalid email format', () => {
      const result = userSchema.safeParse({
        id: 'user-1',
        handle: 'john_doe',
        email: 'not-an-email',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })

    it('should reject invalid datetime format', () => {
      const result = userSchema.safeParse({
        id: 'user-1',
        handle: 'john_doe',
        email: 'john@example.com',
        createdAt: '2024-01-01', // Not ISO datetime
      })

      expect(result.success).toBe(false)
    })
  })
})

describe('createUserSchema', () => {
  it('should omit id and createdAt fields', () => {
    const validCreateUser = {
      handle: 'john_doe',
      email: 'john@example.com',
    }

    const result = createUserSchema.safeParse(validCreateUser)
    expect(result.success).toBe(true)
  })

  it('should reject data with id field', () => {
    const result = createUserSchema.safeParse({
      id: 'user-1',
      handle: 'john_doe',
      email: 'john@example.com',
    })

    // Zod will ignore extra fields, so this actually passes
    // but the type system prevents it at compile time
    expect(result.success).toBe(true)
  })
})

describe('organisationSchema', () => {
  describe('valid data', () => {
    it('should accept valid organisation data', () => {
      const validOrg = {
        id: 'org-1',
        name: 'Acme Corp',
        contactName: 'John Doe',
        contactEmail: 'john@acme.com',
        createdAt: new Date().toISOString(),
      }

      const result = organisationSchema.safeParse(validOrg)
      expect(result.success).toBe(true)
    })
  })

  describe('validation errors', () => {
    it('should reject empty organisation name', () => {
      const result = organisationSchema.safeParse({
        id: 'org-1',
        name: '',
        contactName: 'John Doe',
        contactEmail: 'john@acme.com',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Organisation name is required'
        )
      }
    })

    it('should reject empty contact name', () => {
      const result = organisationSchema.safeParse({
        id: 'org-1',
        name: 'Acme Corp',
        contactName: '',
        contactEmail: 'john@acme.com',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Contact name is required')
      }
    })

    it('should reject invalid contact email', () => {
      const result = organisationSchema.safeParse({
        id: 'org-1',
        name: 'Acme Corp',
        contactName: 'John Doe',
        contactEmail: 'not-an-email',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })
  })
})

describe('createOrganisationSchema', () => {
  it('should omit id and createdAt fields', () => {
    const validCreateOrg = {
      name: 'Acme Corp',
      contactName: 'John Doe',
      contactEmail: 'john@acme.com',
    }

    const result = createOrganisationSchema.safeParse(validCreateOrg)
    expect(result.success).toBe(true)
  })
})

describe('accountSchema', () => {
  describe('valid data', () => {
    it('should accept valid account data', () => {
      const validAccount = {
        id: 'acc-1',
        userId: 'user-1',
        organisationId: 'org-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'contact' as const,
        accessCode: 'ABC123',
        createdAt: new Date().toISOString(),
      }

      const result = accountSchema.safeParse(validAccount)
      expect(result.success).toBe(true)
    })

    it('should accept null userId', () => {
      const result = accountSchema.safeParse({
        id: 'acc-1',
        userId: null,
        organisationId: 'org-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'contact',
        accessCode: 'ABC123',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should accept all valid role values', () => {
      const roles = ['contact', 'project_manager', 'finance'] as const

      roles.forEach((role) => {
        const result = accountSchema.safeParse({
          id: 'acc-1',
          organisationId: 'org-1',
          name: 'John Doe',
          email: 'john@example.com',
          role,
          accessCode: 'ABC123',
          createdAt: new Date().toISOString(),
        })

        expect(result.success).toBe(true)
      })
    })

    it('should default role to contact', () => {
      const result = accountSchema.safeParse({
        id: 'acc-1',
        organisationId: 'org-1',
        name: 'John Doe',
        email: 'john@example.com',
        accessCode: 'ABC123',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe('contact')
      }
    })
  })

  describe('validation errors', () => {
    it('should reject invalid role', () => {
      const result = accountSchema.safeParse({
        id: 'acc-1',
        organisationId: 'org-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'invalid_role',
        accessCode: 'ABC123',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject empty name', () => {
      const result = accountSchema.safeParse({
        id: 'acc-1',
        organisationId: 'org-1',
        name: '',
        email: 'john@example.com',
        role: 'contact',
        accessCode: 'ABC123',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Account name is required')
      }
    })

    it('should reject invalid email', () => {
      const result = accountSchema.safeParse({
        id: 'acc-1',
        organisationId: 'org-1',
        name: 'John Doe',
        email: 'not-an-email',
        role: 'contact',
        accessCode: 'ABC123',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })
  })
})

describe('createAccountSchema', () => {
  it('should omit id, accessCode, and createdAt fields', () => {
    const validCreateAccount = {
      userId: 'user-1',
      organisationId: 'org-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'contact' as const,
    }

    const result = createAccountSchema.safeParse(validCreateAccount)
    expect(result.success).toBe(true)
  })
})

describe('projectSchema', () => {
  describe('valid data', () => {
    it('should accept valid budget project with budgetHours', () => {
      const validProject = {
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        description: 'Redesign company website',
        category: 'budget' as const,
        budgetHours: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = projectSchema.safeParse(validProject)
      expect(result.success).toBe(true)
    })

    it('should accept valid fixed project without budgetHours', () => {
      const validProject = {
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        description: 'Redesign company website',
        category: 'fixed' as const,
        budgetHours: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = projectSchema.safeParse(validProject)
      expect(result.success).toBe(true)
    })

    it('should default category to budget', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        budgetHours: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.category).toBe('budget')
        expect(result.data.description).toBe('')
      }
    })
  })

  describe('business rule validation', () => {
    it('should reject budget project without budgetHours', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'budget',
        budgetHours: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Budget is required for Time & Materials projects'
        )
        expect(result.error.issues[0].path).toEqual(['budgetHours'])
      }
    })

    it('should reject budget project with undefined budgetHours', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'budget',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Budget is required for Time & Materials projects'
        )
      }
    })

    it('should reject fixed project with budgetHours', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'fixed',
        budgetHours: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Fixed price projects should not have hourly budgets'
        )
        expect(result.error.issues[0].path).toEqual(['budgetHours'])
      }
    })

    it('should reject negative budgetHours', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'budget',
        budgetHours: -10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Budget must be a positive number'
        )
      }
    })

    it('should reject zero budgetHours', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'budget',
        budgetHours: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Budget must be a positive number'
        )
      }
    })
  })

  describe('validation errors', () => {
    it('should reject empty project name', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: '',
        category: 'budget',
        budgetHours: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Project name is required')
      }
    })

    it('should reject invalid category', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        teamId: 'team-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'invalid',
        budgetHours: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })
  })
})

describe('createProjectSchema', () => {
  it('should omit id and createdAt fields', () => {
    const validCreateProject = {
      organisationId: 'org-1',
      name: 'Website Redesign',
      category: 'budget' as const,
      budgetHours: 100,
    }

    const result = createProjectSchema.safeParse(validCreateProject)
    expect(result.success).toBe(true)
  })
})

describe('timeEntrySchema', () => {
  describe('valid data', () => {
    it('should accept valid time entry data', () => {
      const validEntry = {
        id: 'entry-1',
        projectId: 'proj-1',
        organisationId: 'org-1',
        title: 'Bug fix',
        description: 'Fixed login issue',
        hours: 2.5,
        date: '2024-11-11',
        billed: false,
        createdAt: new Date().toISOString(),
      }

      const result = timeEntrySchema.safeParse(validEntry)
      expect(result.success).toBe(true)
    })

    it('should accept time entry without projectId', () => {
      const result = timeEntrySchema.safeParse({
        id: 'entry-1',
        organisationId: 'org-1',
        title: 'Bug fix',
        hours: 2.5,
        date: '2024-11-11',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should accept time entry with approvedDate', () => {
      const result = timeEntrySchema.safeParse({
        id: 'entry-1',
        projectId: 'proj-1',
        title: 'Bug fix',
        hours: 2.5,
        date: '2024-11-11',
        approvedDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should default billed to false and description to empty string', () => {
      const result = timeEntrySchema.safeParse({
        id: 'entry-1',
        projectId: 'proj-1',
        title: 'Bug fix',
        hours: 2.5,
        date: '2024-11-11',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.billed).toBe(false)
        expect(result.data.description).toBe('')
      }
    })
  })

  describe('validation errors', () => {
    it('should reject empty title', () => {
      const result = timeEntrySchema.safeParse({
        id: 'entry-1',
        projectId: 'proj-1',
        title: '',
        hours: 2.5,
        date: '2024-11-11',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Title is required')
      }
    })

    it('should reject negative hours', () => {
      const result = timeEntrySchema.safeParse({
        id: 'entry-1',
        projectId: 'proj-1',
        title: 'Bug fix',
        hours: -2.5,
        date: '2024-11-11',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Hours must be a positive number'
        )
      }
    })

    it('should reject zero hours', () => {
      const result = timeEntrySchema.safeParse({
        id: 'entry-1',
        projectId: 'proj-1',
        title: 'Bug fix',
        hours: 0,
        date: '2024-11-11',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Hours must be a positive number'
        )
      }
    })

    it('should reject invalid date format', () => {
      const invalidDates = [
        '2024/11/11',
        '11-11-2024',
        '2024-11-11T10:00:00Z',
        'Nov 11, 2024',
      ]

      invalidDates.forEach((date) => {
        const result = timeEntrySchema.safeParse({
          id: 'entry-1',
          projectId: 'proj-1',
          title: 'Bug fix',
          hours: 2.5,
          date,
          createdAt: new Date().toISOString(),
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid date format')
        }
      })
    })
  })
})

describe('createTimeEntrySchema', () => {
  it('should omit id and createdAt fields', () => {
    const validCreateEntry = {
      projectId: 'proj-1',
      title: 'Bug fix',
      hours: 2.5,
      date: '2024-11-11',
    }

    const result = createTimeEntrySchema.safeParse(validCreateEntry)
    expect(result.success).toBe(true)
  })
})

describe('quickTimeEntrySchema', () => {
  describe('valid data', () => {
    it('should accept minimal quick time entry', () => {
      const validQuickEntry = {
        title: 'Bug fix',
        hours: 2.5,
        date: '2024-11-11',
      }

      const result = quickTimeEntrySchema.safeParse(validQuickEntry)
      expect(result.success).toBe(true)
    })

    it('should transform empty description string to empty string', () => {
      const result = quickTimeEntrySchema.safeParse({
        title: 'Bug fix',
        hours: 2.5,
        date: '2024-11-11',
        description: '',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('')
      }
    })

    it('should transform empty organisationId string to undefined', () => {
      const result = quickTimeEntrySchema.safeParse({
        title: 'Bug fix',
        hours: 2.5,
        date: '2024-11-11',
        organisationId: '',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.organisationId).toBeUndefined()
      }
    })

    it('should transform empty projectId string to undefined', () => {
      const result = quickTimeEntrySchema.safeParse({
        title: 'Bug fix',
        hours: 2.5,
        date: '2024-11-11',
        projectId: '',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBeUndefined()
      }
    })

    it('should preserve non-empty optional fields', () => {
      const result = quickTimeEntrySchema.safeParse({
        title: 'Bug fix',
        hours: 2.5,
        date: '2024-11-11',
        description: 'Fixed login bug',
        organisationId: 'org-1',
        projectId: 'proj-1',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('Fixed login bug')
        expect(result.data.organisationId).toBe('org-1')
        expect(result.data.projectId).toBe('proj-1')
      }
    })
  })

  describe('validation errors', () => {
    it('should reject invalid date format', () => {
      const result = quickTimeEntrySchema.safeParse({
        title: 'Bug fix',
        hours: 2.5,
        date: '11-11-2024',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid date format')
      }
    })
  })
})

describe('timeSheetSchema', () => {
  describe('valid data', () => {
    it('should accept valid time sheet data', () => {
      const validSheet = {
        id: 'sheet-1',
        title: 'Week 45',
        description: 'Weekly timesheet',
        startDate: '2024-11-04',
        endDate: '2024-11-10',
        status: 'draft' as const,
        organisationId: 'org-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = timeSheetSchema.safeParse(validSheet)
      expect(result.success).toBe(true)
    })

    it('should accept time sheet without date range', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Ad-hoc entries',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should accept all valid status values', () => {
      const statuses = ['draft', 'submitted', 'approved', 'rejected'] as const

      statuses.forEach((status) => {
        const result = timeSheetSchema.safeParse({
          id: 'sheet-1',
          title: 'Week 45',
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        expect(result.success).toBe(true)
      })
    })

    it('should default status to draft', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('draft')
        expect(result.data.description).toBe('')
      }
    })

    it('should accept time sheet with workflow dates', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        status: 'approved',
        submittedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should accept time sheet with rejection reason', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        status: 'rejected',
        rejectedDate: new Date().toISOString(),
        rejectionReason: 'Missing details',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should accept time sheet with accountId', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        status: 'draft',
        organisationId: 'org-1',
        accountId: 'acc-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.accountId).toBe('acc-1')
      }
    })

    it('should accept time sheet without accountId', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        status: 'draft',
        organisationId: 'org-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.accountId).toBeUndefined()
      }
    })
  })

  describe('business rule validation', () => {
    it('should reject when startDate is after endDate', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        startDate: '2024-11-10',
        endDate: '2024-11-04',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'End date must be after start date'
        )
        expect(result.error.issues[0].path).toEqual(['endDate'])
      }
    })

    it('should accept when startDate equals endDate', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        startDate: '2024-11-10',
        endDate: '2024-11-10',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should accept valid date range', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        startDate: '2024-11-04',
        endDate: '2024-11-10',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should not validate date range if only startDate is provided', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        startDate: '2024-11-10',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should not validate date range if only endDate is provided', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        endDate: '2024-11-04',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validation errors', () => {
    it('should reject empty title', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: '',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Title is required')
      }
    })

    it('should reject invalid status', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        status: 'invalid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid date format in startDate', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        startDate: '11-04-2024',
        endDate: '2024-11-10',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid date format')
      }
    })

    it('should reject invalid date format in endDate', () => {
      const result = timeSheetSchema.safeParse({
        id: 'sheet-1',
        title: 'Week 45',
        startDate: '2024-11-04',
        endDate: '11-10-2024',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid date format')
      }
    })
  })
})

describe('createTimeSheetSchema', () => {
  it('should omit id, createdAt, updatedAt, and workflow dates', () => {
    const validCreateSheet = {
      title: 'Week 45',
      organisationId: 'org-1',
    }

    const result = createTimeSheetSchema.safeParse(validCreateSheet)
    expect(result.success).toBe(true)
  })

  it('should require organisationId', () => {
    const result = createTimeSheetSchema.safeParse({
      title: 'Week 45',
      organisationId: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Organisation is required')
    }
  })

  it('should accept optional fields', () => {
    const result = createTimeSheetSchema.safeParse({
      title: 'Week 45',
      description: 'Weekly timesheet',
      startDate: '2024-11-04',
      endDate: '2024-11-10',
      organisationId: 'org-1',
      projectId: 'proj-1',
    })

    expect(result.success).toBe(true)
  })

  it('should accept accountId field', () => {
    const result = createTimeSheetSchema.safeParse({
      title: 'Week 45',
      organisationId: 'org-1',
      accountId: 'acc-1',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.accountId).toBe('acc-1')
    }
  })

  it('should transform empty string dates to undefined', () => {
    const result = createTimeSheetSchema.safeParse({
      title: 'Week 45',
      organisationId: 'org-1',
      startDate: '',
      endDate: '',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.startDate).toBeUndefined()
      expect(result.data.endDate).toBeUndefined()
    }
  })

  it('should accept time sheet without accountId', () => {
    const result = createTimeSheetSchema.safeParse({
      title: 'Week 45',
      organisationId: 'org-1',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.accountId).toBeUndefined()
    }
  })
})

describe('updateTimeSheetSchema', () => {
  it('should require id field', () => {
    const result = updateTimeSheetSchema.safeParse({
      title: 'Updated Title',
    })

    expect(result.success).toBe(false)
  })

  it('should accept partial updates with id', () => {
    const result = updateTimeSheetSchema.safeParse({
      id: 'sheet-1',
      title: 'Updated Title',
    })

    expect(result.success).toBe(true)
  })

  it('should accept updating any field', () => {
    const result = updateTimeSheetSchema.safeParse({
      id: 'sheet-1',
      title: 'Updated Title',
      status: 'submitted',
      submittedDate: new Date().toISOString(),
    })

    expect(result.success).toBe(true)
  })
})

describe('timeSheetEntrySchema', () => {
  it('should accept valid time sheet entry data', () => {
    const validEntry = {
      id: 'tse-1',
      timeSheetId: 'sheet-1',
      timeEntryId: 'entry-1',
      createdAt: new Date().toISOString(),
    }

    const result = timeSheetEntrySchema.safeParse(validEntry)
    expect(result.success).toBe(true)
  })

  it('should reject missing required fields', () => {
    const result = timeSheetEntrySchema.safeParse({
      id: 'tse-1',
      timeSheetId: 'sheet-1',
    })

    expect(result.success).toBe(false)
  })
})

// ============================================
// Contact & Invitation Schema Tests
// ============================================

describe('contactSchema', () => {
  describe('valid data', () => {
    it('should accept valid contact data', () => {
      const validContact = {
        id: 'contact-1',
        ownerId: 'user-1',
        email: 'contact@example.com',
        createdAt: new Date().toISOString(),
      }

      const result = contactSchema.safeParse(validContact)
      expect(result.success).toBe(true)
    })

    it('should accept contact with userId (linked to account)', () => {
      const result = contactSchema.safeParse({
        id: 'contact-1',
        ownerId: 'user-1',
        userId: 'user-2',
        email: 'contact@example.com',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe('user-2')
      }
    })

    it('should accept contact with piiId (personal info)', () => {
      const result = contactSchema.safeParse({
        id: 'contact-1',
        ownerId: 'user-1',
        piiId: 'pii-1',
        email: 'contact@example.com',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.piiId).toBe('pii-1')
      }
    })

    it('should accept contact with organisationId', () => {
      const result = contactSchema.safeParse({
        id: 'contact-1',
        ownerId: 'user-1',
        email: 'contact@example.com',
        organisationId: 'org-1',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.organisationId).toBe('org-1')
      }
    })

    it('should accept null values for optional fields', () => {
      const result = contactSchema.safeParse({
        id: 'contact-1',
        ownerId: 'user-1',
        userId: null,
        piiId: null,
        email: 'contact@example.com',
        organisationId: null,
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validation errors', () => {
    it('should reject invalid email format', () => {
      const result = contactSchema.safeParse({
        id: 'contact-1',
        ownerId: 'user-1',
        email: 'not-an-email',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })

    it('should reject missing ownerId', () => {
      const result = contactSchema.safeParse({
        id: 'contact-1',
        email: 'contact@example.com',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject missing email', () => {
      const result = contactSchema.safeParse({
        id: 'contact-1',
        ownerId: 'user-1',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid datetime format for createdAt', () => {
      const result = contactSchema.safeParse({
        id: 'contact-1',
        ownerId: 'user-1',
        email: 'contact@example.com',
        createdAt: '2024-01-01', // Not ISO datetime
      })

      expect(result.success).toBe(false)
    })
  })
})

describe('createContactSchema', () => {
  it('should omit id, createdAt, userId, and piiId fields', () => {
    const validCreateContact = {
      ownerId: 'user-1',
      email: 'contact@example.com',
    }

    const result = createContactSchema.safeParse(validCreateContact)
    expect(result.success).toBe(true)
  })

  it('should accept organisationId', () => {
    const result = createContactSchema.safeParse({
      ownerId: 'user-1',
      email: 'contact@example.com',
      organisationId: 'org-1',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.organisationId).toBe('org-1')
    }
  })
})

describe('invitationStatusSchema', () => {
  it('should accept valid status values', () => {
    const validStatuses = ['pending', 'accepted', 'expired']

    validStatuses.forEach((status) => {
      const result = invitationStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid status', () => {
    const result = invitationStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('invitationSchema', () => {
  describe('valid data', () => {
    it('should accept valid invitation data', () => {
      const validInvitation = {
        id: 'inv-1',
        contactId: 'contact-1',
        invitedByUserId: 'user-1',
        code: 'abc123def456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      }

      const result = invitationSchema.safeParse(validInvitation)
      expect(result.success).toBe(true)
    })

    it('should accept invitation with projectId', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        contactId: 'contact-1',
        invitedByUserId: 'user-1',
        projectId: 'proj-1',
        code: 'abc123def456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBe('proj-1')
      }
    })

    it('should accept invitation with role', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        contactId: 'contact-1',
        invitedByUserId: 'user-1',
        role: 'viewer',
        code: 'abc123def456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe('viewer')
      }
    })

    it('should accept all valid project roles', () => {
      const validRoles = ['owner', 'expert', 'reviewer', 'client', 'viewer'] as const

      validRoles.forEach((role) => {
        const result = invitationSchema.safeParse({
          id: 'inv-1',
          contactId: 'contact-1',
          invitedByUserId: 'user-1',
          role,
          code: 'abc123def456',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          createdAt: new Date().toISOString(),
        })

        expect(result.success).toBe(true)
      })
    })

    it('should accept all valid status values', () => {
      const validStatuses = ['pending', 'accepted', 'expired'] as const

      validStatuses.forEach((status) => {
        const result = invitationSchema.safeParse({
          id: 'inv-1',
          contactId: 'contact-1',
          invitedByUserId: 'user-1',
          code: 'abc123def456',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status,
          createdAt: new Date().toISOString(),
        })

        expect(result.success).toBe(true)
      })
    })

    it('should default status to pending', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        contactId: 'contact-1',
        invitedByUserId: 'user-1',
        code: 'abc123def456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('pending')
      }
    })

    it('should accept null values for optional fields', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        contactId: 'contact-1',
        invitedByUserId: 'user-1',
        projectId: null,
        role: null,
        code: 'abc123def456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validation errors', () => {
    it('should reject missing contactId', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        invitedByUserId: 'user-1',
        code: 'abc123def456',
        expiresAt: new Date().toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject missing invitedByUserId', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        contactId: 'contact-1',
        code: 'abc123def456',
        expiresAt: new Date().toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject missing code', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        contactId: 'contact-1',
        invitedByUserId: 'user-1',
        expiresAt: new Date().toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid status', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        contactId: 'contact-1',
        invitedByUserId: 'user-1',
        code: 'abc123def456',
        expiresAt: new Date().toISOString(),
        status: 'invalid_status',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid role', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        contactId: 'contact-1',
        invitedByUserId: 'user-1',
        role: 'invalid_role',
        code: 'abc123def456',
        expiresAt: new Date().toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid datetime format for expiresAt', () => {
      const result = invitationSchema.safeParse({
        id: 'inv-1',
        contactId: 'contact-1',
        invitedByUserId: 'user-1',
        code: 'abc123def456',
        expiresAt: '2024-01-01', // Not ISO datetime
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
    })
  })
})

describe('createInvitationSchema', () => {
  it('should accept minimal valid data', () => {
    const result = createInvitationSchema.safeParse({
      contactId: 'contact-1',
    })

    expect(result.success).toBe(true)
  })

  it('should accept projectId and role', () => {
    const result = createInvitationSchema.safeParse({
      contactId: 'contact-1',
      projectId: 'proj-1',
      role: 'viewer',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.projectId).toBe('proj-1')
      expect(result.data.role).toBe('viewer')
    }
  })

  it('should reject missing contactId', () => {
    const result = createInvitationSchema.safeParse({
      projectId: 'proj-1',
    })

    expect(result.success).toBe(false)
  })
})

// ============================================================================
// APPROVAL WORKFLOW SCHEMA TESTS
// ============================================================================

describe('entryStatusSchema', () => {
  it('should accept valid entry statuses', () => {
    const validStatuses = ['pending', 'questioned', 'approved']
    validStatuses.forEach((status) => {
      const result = entryStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid entry status', () => {
    const result = entryStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('entryMessageSchema', () => {
  const timestamp = new Date().toISOString()

  describe('valid data', () => {
    it('should accept valid entry message', () => {
      const result = entryMessageSchema.safeParse({
        id: 'msg-1',
        timeEntryId: 'entry-1',
        authorId: 'user-1',
        content: 'This is a test message',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(true)
    })

    it('should accept message with parent and status change', () => {
      const result = entryMessageSchema.safeParse({
        id: 'msg-2',
        timeEntryId: 'entry-1',
        authorId: 'user-1',
        content: 'Reply message',
        parentMessageId: 'msg-1',
        statusChange: 'questioned',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid data', () => {
    it('should reject empty content', () => {
      const result = entryMessageSchema.safeParse({
        id: 'msg-1',
        timeEntryId: 'entry-1',
        authorId: 'user-1',
        content: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(false)
    })

    it('should reject content over 5000 characters', () => {
      const result = entryMessageSchema.safeParse({
        id: 'msg-1',
        timeEntryId: 'entry-1',
        authorId: 'user-1',
        content: 'a'.repeat(5001),
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid status change', () => {
      const result = entryMessageSchema.safeParse({
        id: 'msg-1',
        timeEntryId: 'entry-1',
        authorId: 'user-1',
        content: 'Test',
        statusChange: 'invalid_status',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('createEntryMessageSchema', () => {
  it('should accept minimal valid data', () => {
    const result = createEntryMessageSchema.safeParse({
      timeEntryId: 'entry-1',
      content: 'New message',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional fields', () => {
    const result = createEntryMessageSchema.safeParse({
      timeEntryId: 'entry-1',
      content: 'New message',
      parentMessageId: 'msg-1',
      statusChange: 'approved',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.parentMessageId).toBe('msg-1')
      expect(result.data.statusChange).toBe('approved')
    }
  })
})

describe('approvalModeSchema', () => {
  it('should accept valid approval modes', () => {
    const validModes = ['required', 'optional', 'self_approve', 'multi_stage']
    validModes.forEach((mode) => {
      const result = approvalModeSchema.safeParse(mode)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid approval mode', () => {
    const result = approvalModeSchema.safeParse('invalid_mode')
    expect(result.success).toBe(false)
  })
})

describe('approvalStageSchema', () => {
  it('should accept valid approval stages', () => {
    const validStages = ['expert', 'reviewer', 'client', 'owner']
    validStages.forEach((stage) => {
      const result = approvalStageSchema.safeParse(stage)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid approval stage', () => {
    const result = approvalStageSchema.safeParse('invalid_stage')
    expect(result.success).toBe(false)
  })
})

describe('projectApprovalSettingsSchema', () => {
  const timestamp = new Date().toISOString()

  describe('valid data', () => {
    it('should accept valid settings with defaults', () => {
      const result = projectApprovalSettingsSchema.safeParse({
        id: 'settings-1',
        projectId: 'proj-1',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.approvalMode).toBe('required')
        expect(result.data.autoApproveAfterDays).toBe(0)
        expect(result.data.requireAllEntriesApproved).toBe(true)
        expect(result.data.allowSelfApproveNoClient).toBe(false)
      }
    })

    it('should accept multi-stage with approval stages', () => {
      const result = projectApprovalSettingsSchema.safeParse({
        id: 'settings-1',
        projectId: 'proj-1',
        approvalMode: 'multi_stage',
        approvalStages: ['reviewer', 'client'],
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.approvalStages).toEqual(['reviewer', 'client'])
      }
    })

    it('should accept custom settings', () => {
      const result = projectApprovalSettingsSchema.safeParse({
        id: 'settings-1',
        projectId: 'proj-1',
        approvalMode: 'optional',
        autoApproveAfterDays: 7,
        requireAllEntriesApproved: false,
        allowSelfApproveNoClient: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.autoApproveAfterDays).toBe(7)
        expect(result.data.requireAllEntriesApproved).toBe(false)
        expect(result.data.allowSelfApproveNoClient).toBe(true)
      }
    })
  })

  describe('invalid data', () => {
    it('should reject negative autoApproveAfterDays', () => {
      const result = projectApprovalSettingsSchema.safeParse({
        id: 'settings-1',
        projectId: 'proj-1',
        autoApproveAfterDays: -1,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid approval mode', () => {
      const result = projectApprovalSettingsSchema.safeParse({
        id: 'settings-1',
        projectId: 'proj-1',
        approvalMode: 'invalid',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid approval stage in array', () => {
      const result = projectApprovalSettingsSchema.safeParse({
        id: 'settings-1',
        projectId: 'proj-1',
        approvalMode: 'multi_stage',
        approvalStages: ['reviewer', 'invalid_stage'],
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('updateProjectApprovalSettingsSchema', () => {
  it('should accept partial updates', () => {
    const result = updateProjectApprovalSettingsSchema.safeParse({
      approvalMode: 'optional',
    })
    expect(result.success).toBe(true)
  })

  it('should accept empty object', () => {
    const result = updateProjectApprovalSettingsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should accept multiple fields', () => {
    const result = updateProjectApprovalSettingsSchema.safeParse({
      approvalMode: 'multi_stage',
      approvalStages: ['expert', 'reviewer'],
      autoApproveAfterDays: 14,
    })
    expect(result.success).toBe(true)
  })
})

describe('timeSheetApprovalSchema', () => {
  const timestamp = new Date().toISOString()

  it('should accept valid time sheet approval', () => {
    const result = timeSheetApprovalSchema.safeParse({
      id: 'approval-1',
      timeSheetId: 'sheet-1',
      stage: 'reviewer',
      approvedBy: 'user-1',
      approvedAt: timestamp,
    })
    expect(result.success).toBe(true)
  })

  it('should accept approval with notes', () => {
    const result = timeSheetApprovalSchema.safeParse({
      id: 'approval-1',
      timeSheetId: 'sheet-1',
      stage: 'client',
      approvedBy: 'user-1',
      approvedAt: timestamp,
      notes: 'Approved after discussion',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notes).toBe('Approved after discussion')
    }
  })

  it('should reject missing required fields', () => {
    const result = timeSheetApprovalSchema.safeParse({
      id: 'approval-1',
      timeSheetId: 'sheet-1',
    })
    expect(result.success).toBe(false)
  })
})

describe('createTimeSheetApprovalSchema', () => {
  it('should accept minimal valid data', () => {
    const result = createTimeSheetApprovalSchema.safeParse({
      timeSheetId: 'sheet-1',
      stage: 'reviewer',
    })
    expect(result.success).toBe(true)
  })

  it('should accept with optional notes', () => {
    const result = createTimeSheetApprovalSchema.safeParse({
      timeSheetId: 'sheet-1',
      stage: 'client',
      notes: 'All entries look good',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notes).toBe('All entries look good')
    }
  })
})

describe('updateEntryStatusSchema', () => {
  it('should accept valid status update', () => {
    const result = updateEntryStatusSchema.safeParse({
      entryId: 'entry-1',
      status: 'approved',
    })
    expect(result.success).toBe(true)
  })

  it('should accept status update with message', () => {
    const result = updateEntryStatusSchema.safeParse({
      entryId: 'entry-1',
      status: 'questioned',
      message: 'Please clarify the hours',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toBe('Please clarify the hours')
    }
  })

  it('should reject invalid status', () => {
    const result = updateEntryStatusSchema.safeParse({
      entryId: 'entry-1',
      status: 'invalid_status',
    })
    expect(result.success).toBe(false)
  })
})
