import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  handle: text('handle').notNull().unique(),
  email: text('email').notNull().unique(),
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
  organisationId: text('organisation_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role', { enum: ['contact', 'project_manager', 'finance'] }).notNull().default('contact'),
  accessCode: text('access_code').notNull().unique(),
  createdAt: text('created_at').notNull(),
})

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  organisationId: text('organisation_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category', { enum: ['budget', 'fixed'] }).notNull().default('budget'),
  budgetHours: real('budget_hours'),
  createdAt: text('created_at').notNull(),
})

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  organisationId: text('organisation_id').references(() => organisations.id, { onDelete: 'cascade' }),
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
  status: text('status', { enum: ['draft', 'submitted', 'approved', 'rejected'] }).notNull().default('draft'),
  submittedDate: text('submitted_date'),
  approvedDate: text('approved_date'),
  rejectedDate: text('rejected_date'),
  rejectionReason: text('rejection_reason'),
  organisationId: text('organisation_id').references(() => organisations.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const timeSheetEntries = sqliteTable('time_sheet_entries', {
  id: text('id').primaryKey(),
  timeSheetId: text('time_sheet_id').notNull().references(() => timeSheets.id, { onDelete: 'cascade' }),
  timeEntryId: text('time_entry_id').notNull().references(() => timeEntries.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
})
