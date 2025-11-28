import { sqliteTable, text, real, integer, unique } from 'drizzle-orm/sqlite-core'

// PII table - GDPR compliant personal data storage (deletable for right-to-erasure)
export const pii = sqliteTable('pii', {
  id: text('id').primaryKey(),
  name: text('name'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// Users table - unified identity model
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  piiId: text('pii_id').references(() => pii.id, { onDelete: 'set null' }),
  handle: text('handle').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  role: text('role', { enum: ['super_admin', 'admin'] }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// Sessions table - cookie-based authentication
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
})

export const organisations = sqliteTable('organisations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone'),
  createdAt: text('created_at').notNull(),
})

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  organisationId: text('organisation_id')
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role', { enum: ['contact', 'project_manager', 'finance'] })
    .notNull()
    .default('contact'),
  accessCode: text('access_code').notNull().unique(),
  createdAt: text('created_at').notNull(),
})

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  organisationId: text('organisation_id')
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category', { enum: ['budget', 'fixed'] })
    .notNull()
    .default('budget'),
  budgetHours: real('budget_hours'),
  createdAt: text('created_at').notNull(),
})

// Project members table - project-scoped access control
export const projectMembers = sqliteTable(
  'project_members',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', {
      enum: ['owner', 'expert', 'reviewer', 'client', 'viewer'],
    }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [unique().on(table.projectId, table.userId)]
)

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, {
    onDelete: 'cascade',
  }),
  organisationId: text('organisation_id').references(() => organisations.id, {
    onDelete: 'cascade',
  }),
  title: text('title').notNull(),
  description: text('description').default('').notNull(),
  hours: real('hours').notNull(),
  date: text('date').notNull(),
  approvedDate: text('approved_date'),
  billed: integer('billed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})

export const timeSheets = sqliteTable('time_sheets', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').default('').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  status: text('status', {
    enum: ['draft', 'submitted', 'approved', 'rejected'],
  })
    .notNull()
    .default('draft'),
  submittedDate: text('submitted_date'),
  approvedDate: text('approved_date'),
  rejectedDate: text('rejected_date'),
  rejectionReason: text('rejection_reason'),
  organisationId: text('organisation_id').references(() => organisations.id, {
    onDelete: 'set null',
  }),
  projectId: text('project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),
  accountId: text('account_id').references(() => accounts.id, {
    onDelete: 'set null',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const timeSheetEntries = sqliteTable('time_sheet_entries', {
  id: text('id').primaryKey(),
  timeSheetId: text('time_sheet_id')
    .notNull()
    .references(() => timeSheets.id, { onDelete: 'cascade' }),
  timeEntryId: text('time_entry_id')
    .notNull()
    .references(() => timeEntries.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
})

// Contacts table - personal address book for each user
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), // If contact has an account
  piiId: text('pii_id').references(() => pii.id, { onDelete: 'set null' }), // Only if NOT linked to user
  email: text('email').notNull(), // For invitations
  organisationId: text('organisation_id').references(() => organisations.id, {
    onDelete: 'set null',
  }),
  createdAt: text('created_at').notNull(),
})

// Invitations table - project invitations sent to contacts
export const invitations = sqliteTable('invitations', {
  id: text('id').primaryKey(),
  contactId: text('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  invitedByUserId: text('invited_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, {
    onDelete: 'cascade',
  }), // Optional: invite to specific project
  role: text('role', {
    enum: ['owner', 'expert', 'reviewer', 'client', 'viewer'],
  }), // Role to assign when accepted
  code: text('code').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'expired'] })
    .notNull()
    .default('pending'),
  createdAt: text('created_at').notNull(),
})
