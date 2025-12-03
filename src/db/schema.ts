import { sqliteTable, text, real, integer, unique } from 'drizzle-orm/sqlite-core'
import * as betterAuth from './better-auth-schema'

// Re-export Better Auth tables for backwards compatibility
export { user, session, organization, team, teamMember } from './better-auth-schema'

// Backwards-compatible aliases for old table names
// These point to Better Auth tables to allow gradual migration of tests
export const users = betterAuth.user
export const sessions = betterAuth.session
export const organisations = betterAuth.organization
export const projects = betterAuth.team
export const projectMembers = betterAuth.teamMember

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

// Accounts table - client portal access (linked to organizations)
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => betterAuth.user.id, { onDelete: 'set null' }),
  organisationId: text('organisation_id')
    .notNull()
    .references(() => betterAuth.organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role', { enum: ['contact', 'project_manager', 'finance'] })
    .notNull()
    .default('contact'),
  accessCode: text('access_code').notNull().unique(),
  createdAt: text('created_at').notNull(),
})

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey(),
  createdByUserId: text('created_by_user_id').references(() => betterAuth.user.id, {
    onDelete: 'set null',
  }),
  projectId: text('project_id').references(() => betterAuth.team.id, {
    onDelete: 'cascade',
  }),
  organisationId: text('organisation_id').references(() => betterAuth.organization.id, {
    onDelete: 'cascade',
  }),
  title: text('title').notNull(),
  description: text('description').default('').notNull(),
  hours: real('hours').notNull(),
  date: text('date').notNull(),
  // Approval workflow fields
  status: text('status', { enum: ['pending', 'questioned', 'approved'] })
    .notNull()
    .default('pending'),
  statusChangedAt: text('status_changed_at'),
  statusChangedBy: text('status_changed_by').references(() => betterAuth.user.id, {
    onDelete: 'set null',
  }),
  lastEditedAt: text('last_edited_at'),
  createdBy: text('created_by').references(() => betterAuth.user.id, {
    onDelete: 'set null',
  }),
  // Legacy field - kept for backwards compatibility, set when status becomes 'approved'
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
  organisationId: text('organisation_id').references(() => betterAuth.organization.id, {
    onDelete: 'set null',
  }),
  projectId: text('project_id').references(() => betterAuth.team.id, {
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
  // Track entry state when added to sheet (for edit detection)
  entryLastEditedAtWhenAdded: text('entry_last_edited_at_when_added'),
  // Individual approval within sheet context
  approvedInSheet: integer('approved_in_sheet', { mode: 'boolean' })
    .notNull()
    .default(false),
  approvedInSheetAt: text('approved_in_sheet_at'),
  approvedInSheetBy: text('approved_in_sheet_by').references(() => betterAuth.user.id, {
    onDelete: 'set null',
  }),
  createdAt: text('created_at').notNull(),
})

// Contacts table - personal address book for each user
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => betterAuth.user.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => betterAuth.user.id, { onDelete: 'set null' }), // If contact has an account
  piiId: text('pii_id').references(() => pii.id, { onDelete: 'set null' }), // Only if NOT linked to user
  email: text('email').notNull(), // For invitations
  organisationId: text('organisation_id').references(() => betterAuth.organization.id, {
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
    .references(() => betterAuth.user.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => betterAuth.team.id, {
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

// Entry messages - threaded comments on time entries
export const entryMessages = sqliteTable('entry_messages', {
  id: text('id').primaryKey(),
  timeEntryId: text('time_entry_id')
    .notNull()
    .references(() => timeEntries.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => betterAuth.user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  // Optional: link to parent message for threading
  parentMessageId: text('parent_message_id'),
  // Track if this message triggered a status change
  statusChange: text('status_change', {
    enum: ['questioned', 'approved', 'pending'],
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'), // Soft delete for audit trail
})

// Project approval settings - per-project workflow configuration
export const projectApprovalSettings = sqliteTable('project_approval_settings', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .unique()
    .references(() => betterAuth.team.id, { onDelete: 'cascade' }),
  approvalMode: text('approval_mode', {
    enum: ['required', 'optional', 'self_approve', 'multi_stage'],
  })
    .notNull()
    .default('required'),
  autoApproveAfterDays: integer('auto_approve_after_days').notNull().default(0),
  requireAllEntriesApproved: integer('require_all_entries_approved', {
    mode: 'boolean',
  })
    .notNull()
    .default(true),
  allowSelfApproveNoClient: integer('allow_self_approve_no_client', {
    mode: 'boolean',
  })
    .notNull()
    .default(false),
  // For multi_stage mode: JSON array of role names in order, e.g. ['reviewer', 'client']
  approvalStages: text('approval_stages'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// Time sheet approvals - track multi-stage approvals
export const timeSheetApprovals = sqliteTable('time_sheet_approvals', {
  id: text('id').primaryKey(),
  timeSheetId: text('time_sheet_id')
    .notNull()
    .references(() => timeSheets.id, { onDelete: 'cascade' }),
  stage: text('stage').notNull(), // Role that approved: 'reviewer', 'client', etc.
  approvedBy: text('approved_by')
    .notNull()
    .references(() => betterAuth.user.id, { onDelete: 'cascade' }),
  approvedAt: text('approved_at').notNull(),
  notes: text('notes'),
})
