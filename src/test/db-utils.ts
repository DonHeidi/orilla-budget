import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from '@/db/schema'
import * as betterAuth from '@/db/better-auth-schema'
import { eq as _eq } from 'drizzle-orm'

/**
 * Generate a unique ID for test data using crypto.randomUUID()
 */
function generateTestId(): string {
  return crypto.randomUUID()
}

/**
 * Creates an in-memory SQLite database for testing
 * Uses Bun's native SQLite for optimal performance
 */
export function createTestDb() {
  const sqlite = new Database(':memory:')

  // FK constraints OFF during migrations (some migrations create tables before their FK targets)
  sqlite.run('PRAGMA foreign_keys = OFF;')

  const db = drizzle(sqlite, { schema })

  // Apply migrations
  migrate(db, { migrationsFolder: './drizzle' })

  // Enable foreign key constraints after migrations (required for cascade deletes)
  sqlite.run('PRAGMA foreign_keys = ON;')

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
  await db.delete(schema.projects) // project table
  await db.delete(betterAuth.team) // Better Auth team table
  await db.delete(schema.accounts)
  await db.delete(schema.organisations)
  await db.delete(schema.sessions)
  await db.delete(schema.users)
  await db.delete(schema.pii)
}

/**
 * Factory functions for creating test data
 *
 * Note: Better Auth tables use Date objects for timestamps (mode: 'timestamp_ms'),
 * while app tables use ISO strings. Factories create data for their respective schemas.
 */
export const testFactories = {
  // Better Auth user table (uses Date for timestamps)
  user: (overrides?: Partial<typeof schema.users.$inferInsert>) => {
    const now = new Date()
    return {
      id: generateTestId(),
      name: 'Test User',
      handle: `testuser-${generateTestId().substring(0, 8)}`,
      email: `test-${generateTestId().substring(0, 8)}@example.com`,
      emailVerified: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },

  // Better Auth organization table (uses Date for timestamps)
  organisation: (
    overrides?: Partial<typeof schema.organisations.$inferInsert>
  ) => {
    const now = new Date()
    const uniqueId = generateTestId().substring(0, 8)
    return {
      id: generateTestId(),
      name: 'Test Organisation',
      slug: `test-org-${uniqueId}`,
      contactName: 'John Doe',
      contactEmail: 'john@example.com',
      contactPhone: '123-456-7890',
      createdAt: now,
      ...overrides,
    }
  },

  // App accounts table (uses ISO strings for timestamps)
  account: (
    organisationId: string,
    overrides?: Partial<typeof schema.accounts.$inferInsert>
  ) => ({
    id: generateTestId(),
    organisationId,
    name: 'Test Account',
    email: `account-${generateTestId().substring(0, 8)}@example.com`,
    role: 'contact' as const,
    accessCode: generateTestId().substring(0, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  // Better Auth team table (authorization layer)
  team: (
    organisationId: string,
    overrides?: Partial<typeof betterAuth.team.$inferInsert>
  ) => {
    const now = new Date()
    return {
      id: generateTestId(),
      organizationId: organisationId,
      name: 'Test Project',
      description: 'A test project',
      category: 'budget' as const,
      budgetHours: 100,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },

  // Project table (business data layer)
  project: (
    teamId: string,
    organisationId: string,
    overrides?: Partial<typeof schema.projects.$inferInsert>
  ) => {
    const now = new Date().toISOString()
    return {
      id: generateTestId(),
      teamId,
      organisationId,
      name: 'Test Project',
      description: 'A test project',
      category: 'budget' as const,
      budgetHours: 100,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },

  timeEntry: (overrides?: Partial<typeof schema.timeEntries.$inferInsert>) => ({
    id: generateTestId(),
    title: 'Test Time Entry',
    hours: 2,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  timeSheet: (overrides?: Partial<typeof schema.timeSheets.$inferInsert>) => ({
    id: generateTestId(),
    title: 'Test Time Sheet',
    description: 'A test time sheet',
    status: 'draft' as const,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Better Auth session table (uses Date for timestamps)
  session: (
    userId: string,
    overrides?: Partial<typeof schema.sessions.$inferInsert>
  ) => {
    const now = new Date()
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    return {
      id: generateTestId(),
      userId,
      token: generateTestId(),
      expiresAt: expiry,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },

  pii: (overrides?: Partial<typeof schema.pii.$inferInsert>) => {
    const timestamp = new Date().toISOString()
    return {
      id: generateTestId(),
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
    id: generateTestId(),
    ownerId,
    userId: null,
    piiId: null,
    email: `contact-${generateTestId().substring(0, 8)}@example.com`,
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
      id: generateTestId(),
      contactId,
      invitedByUserId,
      projectId: null,
      role: null,
      code: generateTestId().substring(0, 12),
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
      id: generateTestId(),
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
      id: generateTestId(),
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
    id: generateTestId(),
    timeSheetId,
    stage: 'reviewer',
    approvedBy,
    approvedAt: new Date().toISOString(),
    notes: null,
    ...overrides,
  }),

  // Better Auth teamMember table (uses Date for timestamps)
  projectMember: (
    projectId: string,
    userId: string,
    overrides?: Partial<typeof schema.projectMembers.$inferInsert>
  ) => {
    const now = new Date()
    return {
      id: generateTestId(),
      teamId: projectId,
      userId,
      projectRole: 'expert' as const,
      createdAt: now,
      ...overrides,
    }
  },
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

  /**
   * Creates both a team (auth layer) and project (business layer) record
   * Returns the project record with teamId for use in tests
   */
  async project(
    db: ReturnType<typeof createTestDb>['db'],
    organisationId: string,
    data?: Partial<typeof schema.projects.$inferInsert> & { name?: string }
  ) {
    // First create the team (Better Auth table)
    const teamData = testFactories.team(organisationId, {
      name: data?.name || 'Test Project',
      description: data?.description || 'A test project',
      category: data?.category || 'budget',
      budgetHours: data?.budgetHours ?? 100,
    })
    const [team] = await db.insert(betterAuth.team).values(teamData).returning()

    // Then create the project (business data table)
    const projectData = testFactories.project(team.id, organisationId, {
      name: data?.name || team.name,
      description: data?.description || team.description || '',
      category: data?.category || (team.category as 'budget' | 'fixed') || 'budget',
      budgetHours: data?.budgetHours ?? team.budgetHours,
      ...data,
    })
    const [project] = await db.insert(schema.projects).values(projectData).returning()

    return project
  },

  /**
   * Creates just a team record (for tests that need raw team access)
   */
  async team(
    db: ReturnType<typeof createTestDb>['db'],
    organisationId: string,
    data?: Partial<typeof betterAuth.team.$inferInsert>
  ) {
    const [team] = await db
      .insert(betterAuth.team)
      .values(testFactories.team(organisationId, data))
      .returning()
    return team
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

  async projectMember(
    db: ReturnType<typeof createTestDb>['db'],
    projectId: string,
    userId: string,
    data?: Partial<typeof schema.projectMembers.$inferInsert>
  ) {
    const [member] = await db
      .insert(schema.projectMembers)
      .values(testFactories.projectMember(projectId, userId, data))
      .returning()
    return member
  },
}
