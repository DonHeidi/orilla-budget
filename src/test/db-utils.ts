import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from '@/db/schema'
import { eq as _eq } from 'drizzle-orm'

/**
 * Creates an in-memory SQLite database for testing
 * Uses Bun's native SQLite for optimal performance
 */
export function createTestDb() {
  const sqlite = new Database(':memory:')

  // Enable foreign key constraints (required for cascade deletes)
  sqlite.run('PRAGMA foreign_keys = ON;')

  const db = drizzle(sqlite, { schema })

  // Apply migrations
  migrate(db, { migrationsFolder: './drizzle' })

  return { db, sqlite }
}

/**
 * Clean up all tables in the database
 */
export async function cleanDatabase(db: ReturnType<typeof createTestDb>['db']) {
  await db.delete(schema.invitations)
  await db.delete(schema.contacts)
  await db.delete(schema.entryMessages)
  await db.delete(schema.timeSheetApprovals)
  await db.delete(schema.timeSheetEntries)
  await db.delete(schema.timeSheets)
  await db.delete(schema.timeEntries)
  await db.delete(schema.projectApprovalSettings)
  await db.delete(schema.projectMembers)
  await db.delete(schema.projects)
  await db.delete(schema.accounts)
  await db.delete(schema.organisations)
  await db.delete(schema.sessions)
  await db.delete(schema.users)
  await db.delete(schema.pii)
}

/**
 * Factory functions for creating test data
 */
export const testFactories = {
  user: (overrides?: Partial<typeof schema.users.$inferInsert>) => {
    const timestamp = new Date().toISOString()
    return {
      id: Math.random().toString(36).substring(2, 15),
      handle: 'testuser',
      email: 'test@example.com',
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    }
  },

  organisation: (
    overrides?: Partial<typeof schema.organisations.$inferInsert>
  ) => ({
    id: Math.random().toString(36).substring(2, 15),
    name: 'Test Organisation',
    contactName: 'John Doe',
    contactEmail: 'john@example.com',
    contactPhone: '123-456-7890',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  account: (
    organisationId: string,
    overrides?: Partial<typeof schema.accounts.$inferInsert>
  ) => ({
    id: Math.random().toString(36).substring(2, 15),
    organisationId,
    name: 'Test Account',
    email: 'account@example.com',
    role: 'contact' as const,
    accessCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  project: (
    organisationId: string,
    overrides?: Partial<typeof schema.projects.$inferInsert>
  ) => ({
    id: Math.random().toString(36).substring(2, 15),
    organisationId,
    name: 'Test Project',
    description: 'A test project',
    category: 'budget' as const,
    budgetHours: 100,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  timeEntry: (overrides?: Partial<typeof schema.timeEntries.$inferInsert>) => ({
    id: Math.random().toString(36).substring(2, 15),
    title: 'Test Time Entry',
    hours: 2,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  timeSheet: (overrides?: Partial<typeof schema.timeSheets.$inferInsert>) => ({
    id: Math.random().toString(36).substring(2, 15),
    title: 'Test Time Sheet',
    description: 'A test time sheet',
    status: 'draft' as const,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  session: (
    userId: string,
    overrides?: Partial<typeof schema.sessions.$inferInsert>
  ) => {
    const now = new Date()
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    return {
      id: Math.random().toString(36).substring(2, 15),
      userId,
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      expiresAt: expiry.toISOString(),
      createdAt: now.toISOString(),
      ...overrides,
    }
  },

  pii: (overrides?: Partial<typeof schema.pii.$inferInsert>) => {
    const timestamp = new Date().toISOString()
    return {
      id: Math.random().toString(36).substring(2, 15),
      name: 'Test User',
      phone: null,
      address: null,
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    }
  },

  contact: (
    ownerId: string,
    overrides?: Partial<typeof schema.contacts.$inferInsert>
  ) => ({
    id: Math.random().toString(36).substring(2, 15),
    ownerId,
    userId: null,
    piiId: null,
    email: 'contact@example.com',
    organisationId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  invitation: (
    contactId: string,
    invitedByUserId: string,
    overrides?: Partial<typeof schema.invitations.$inferInsert>
  ) => {
    const now = new Date()
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    return {
      id: Math.random().toString(36).substring(2, 15),
      contactId,
      invitedByUserId,
      projectId: null,
      role: null,
      code: Math.random().toString(36).substring(2, 14), // 12-char code
      expiresAt: expiry.toISOString(),
      status: 'pending' as const,
      createdAt: now.toISOString(),
      ...overrides,
    }
  },

  entryMessage: (
    timeEntryId: string,
    authorId: string,
    overrides?: Partial<typeof schema.entryMessages.$inferInsert>
  ) => {
    const now = new Date().toISOString()
    return {
      id: Math.random().toString(36).substring(2, 15),
      timeEntryId,
      authorId,
      content: 'Test message content',
      parentMessageId: null,
      statusChange: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...overrides,
    }
  },

  projectApprovalSettings: (
    projectId: string,
    overrides?: Partial<typeof schema.projectApprovalSettings.$inferInsert>
  ) => {
    const now = new Date().toISOString()
    return {
      id: Math.random().toString(36).substring(2, 15),
      projectId,
      approvalMode: 'required' as const,
      autoApproveAfterDays: 0,
      requireAllEntriesApproved: true,
      allowSelfApproveNoClient: false,
      approvalStages: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },

  timeSheetApproval: (
    timeSheetId: string,
    approvedBy: string,
    overrides?: Partial<typeof schema.timeSheetApprovals.$inferInsert>
  ) => ({
    id: Math.random().toString(36).substring(2, 15),
    timeSheetId,
    stage: 'reviewer',
    approvedBy,
    approvedAt: new Date().toISOString(),
    notes: null,
    ...overrides,
  }),
}

/**
 * Seed functions for inserting test data
 */
export const seed = {
  async user(
    db: ReturnType<typeof createTestDb>['db'],
    data?: Partial<typeof schema.users.$inferInsert>
  ) {
    const [user] = await db
      .insert(schema.users)
      .values(testFactories.user(data))
      .returning()
    return user
  },

  async organisation(
    db: ReturnType<typeof createTestDb>['db'],
    data?: Partial<typeof schema.organisations.$inferInsert>
  ) {
    const [org] = await db
      .insert(schema.organisations)
      .values(testFactories.organisation(data))
      .returning()
    return org
  },

  async account(
    db: ReturnType<typeof createTestDb>['db'],
    organisationId: string,
    data?: Partial<typeof schema.accounts.$inferInsert>
  ) {
    const [account] = await db
      .insert(schema.accounts)
      .values(testFactories.account(organisationId, data))
      .returning()
    return account
  },

  async project(
    db: ReturnType<typeof createTestDb>['db'],
    organisationId: string,
    data?: Partial<typeof schema.projects.$inferInsert>
  ) {
    const [project] = await db
      .insert(schema.projects)
      .values(testFactories.project(organisationId, data))
      .returning()
    return project
  },

  async timeEntry(
    db: ReturnType<typeof createTestDb>['db'],
    data?: Partial<typeof schema.timeEntries.$inferInsert>
  ) {
    const [entry] = await db
      .insert(schema.timeEntries)
      .values(testFactories.timeEntry(data))
      .returning()
    return entry
  },

  async timeSheet(
    db: ReturnType<typeof createTestDb>['db'],
    data?: Partial<typeof schema.timeSheets.$inferInsert>
  ) {
    const [sheet] = await db
      .insert(schema.timeSheets)
      .values(testFactories.timeSheet(data))
      .returning()
    return sheet
  },

  async session(
    db: ReturnType<typeof createTestDb>['db'],
    userId: string,
    data?: Partial<typeof schema.sessions.$inferInsert>
  ) {
    const [session] = await db
      .insert(schema.sessions)
      .values(testFactories.session(userId, data))
      .returning()
    return session
  },

  async piiRecord(
    db: ReturnType<typeof createTestDb>['db'],
    data?: Partial<typeof schema.pii.$inferInsert>
  ) {
    const [record] = await db
      .insert(schema.pii)
      .values(testFactories.pii(data))
      .returning()
    return record
  },

  async contact(
    db: ReturnType<typeof createTestDb>['db'],
    ownerId: string,
    data?: Partial<typeof schema.contacts.$inferInsert>
  ) {
    const [contact] = await db
      .insert(schema.contacts)
      .values(testFactories.contact(ownerId, data))
      .returning()
    return contact
  },

  async invitation(
    db: ReturnType<typeof createTestDb>['db'],
    contactId: string,
    invitedByUserId: string,
    data?: Partial<typeof schema.invitations.$inferInsert>
  ) {
    const [invitation] = await db
      .insert(schema.invitations)
      .values(testFactories.invitation(contactId, invitedByUserId, data))
      .returning()
    return invitation
  },

  async entryMessage(
    db: ReturnType<typeof createTestDb>['db'],
    timeEntryId: string,
    authorId: string,
    data?: Partial<typeof schema.entryMessages.$inferInsert>
  ) {
    const [message] = await db
      .insert(schema.entryMessages)
      .values(testFactories.entryMessage(timeEntryId, authorId, data))
      .returning()
    return message
  },

  async projectApprovalSettings(
    db: ReturnType<typeof createTestDb>['db'],
    projectId: string,
    data?: Partial<typeof schema.projectApprovalSettings.$inferInsert>
  ) {
    const [settings] = await db
      .insert(schema.projectApprovalSettings)
      .values(testFactories.projectApprovalSettings(projectId, data))
      .returning()
    return settings
  },

  async timeSheetApproval(
    db: ReturnType<typeof createTestDb>['db'],
    timeSheetId: string,
    approvedBy: string,
    data?: Partial<typeof schema.timeSheetApprovals.$inferInsert>
  ) {
    const [approval] = await db
      .insert(schema.timeSheetApprovals)
      .values(testFactories.timeSheetApproval(timeSheetId, approvedBy, data))
      .returning()
    return approval
  },
}
