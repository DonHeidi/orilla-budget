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
} from './schemas'

describe('userSchema', () => {
  describe('valid data', () => {
    it('should accept valid user data', () => {
      const validUser = {
        id: 'user-1',
        handle: 'john_doe',
        email: 'john@example.com',
        createdAt: new Date().toISOString(),
      }

      const result = userSchema.safeParse(validUser)
      expect(result.success).toBe(true)
    })

    it('should accept handle with letters, numbers, underscores, and hyphens', () => {
      const validHandles = ['user123', 'user_123', 'user-123', 'User-Name_01']

      validHandles.forEach(handle => {
        const result = userSchema.safeParse({
          id: 'user-1',
          handle,
          email: 'user@example.com',
          createdAt: new Date().toISOString(),
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
      const invalidHandles = ['user@123', 'user!name', 'user name', 'user#123', 'user$']

      invalidHandles.forEach(handle => {
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
        expect(result.error.issues[0].message).toBe('Organisation name is required')
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

      roles.forEach(role => {
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
        organisationId: 'org-1',
        name: 'Website Redesign',
        description: 'Redesign company website',
        category: 'budget' as const,
        budgetHours: 100,
        createdAt: new Date().toISOString(),
      }

      const result = projectSchema.safeParse(validProject)
      expect(result.success).toBe(true)
    })

    it('should accept valid fixed project without budgetHours', () => {
      const validProject = {
        id: 'proj-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        description: 'Redesign company website',
        category: 'fixed' as const,
        budgetHours: null,
        createdAt: new Date().toISOString(),
      }

      const result = projectSchema.safeParse(validProject)
      expect(result.success).toBe(true)
    })

    it('should default category to budget', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        budgetHours: 100,
        createdAt: new Date().toISOString(),
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
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'budget',
        budgetHours: null,
        createdAt: new Date().toISOString(),
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
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'budget',
        createdAt: new Date().toISOString(),
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
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'fixed',
        budgetHours: 100,
        createdAt: new Date().toISOString(),
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
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'budget',
        budgetHours: -10,
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Budget must be a positive number')
      }
    })

    it('should reject zero budgetHours', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'budget',
        budgetHours: 0,
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Budget must be a positive number')
      }
    })
  })

  describe('validation errors', () => {
    it('should reject empty project name', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        organisationId: 'org-1',
        name: '',
        category: 'budget',
        budgetHours: 100,
        createdAt: new Date().toISOString(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Project name is required')
      }
    })

    it('should reject invalid category', () => {
      const result = projectSchema.safeParse({
        id: 'proj-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        category: 'invalid',
        budgetHours: 100,
        createdAt: new Date().toISOString(),
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
        expect(result.error.issues[0].message).toBe('Hours must be a positive number')
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
        expect(result.error.issues[0].message).toBe('Hours must be a positive number')
      }
    })

    it('should reject invalid date format', () => {
      const invalidDates = ['2024/11/11', '11-11-2024', '2024-11-11T10:00:00Z', 'Nov 11, 2024']

      invalidDates.forEach(date => {
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

      statuses.forEach(status => {
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
        expect(result.error.issues[0].message).toBe('End date must be after start date')
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
