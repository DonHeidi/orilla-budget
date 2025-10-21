import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'

export const organisations = sqliteTable('organisations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  totalBudgetHours: real('total_budget_hours').notNull(),
  createdAt: text('created_at').notNull(),
})

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
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
  createdAt: text('created_at').notNull(),
})
