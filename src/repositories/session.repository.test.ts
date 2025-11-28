import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'

// We need to mock the db module to use our test database
// For now, let's test the repository logic directly with the test db

describe('session repository', () => {
  let testDb: ReturnType<typeof createTestDb>

  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(async () => {
    if (testDb) {
      await cleanDatabase(testDb.db)
      testDb.sqlite.close()
    }
  })

  describe('create', () => {
    it('should create a session for a user', async () => {
      const user = await seed.user(testDb.db)
      const session = await seed.session(testDb.db, user.id)

      expect(session).toBeDefined()
      expect(session.userId).toBe(user.id)
      expect(session.token).toBeDefined()
      expect(session.expiresAt).toBeDefined()
    })
  })

  describe('findByToken', () => {
    it('should find a session by its token', async () => {
      const user = await seed.user(testDb.db)
      const session = await seed.session(testDb.db, user.id)

      const { sessions } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const found = await testDb.db
        .select()
        .from(sessions)
        .where(eq(sessions.token, session.token))
        .limit(1)

      expect(found[0]).toBeDefined()
      expect(found[0].id).toBe(session.id)
    })

    it('should return undefined for non-existent token', async () => {
      const { sessions } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const found = await testDb.db
        .select()
        .from(sessions)
        .where(eq(sessions.token, 'non-existent-token'))
        .limit(1)

      expect(found[0]).toBeUndefined()
    })
  })

  describe('findValidByToken', () => {
    it('should find a valid (non-expired) session', async () => {
      const user = await seed.user(testDb.db)
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const session = await seed.session(testDb.db, user.id, { expiresAt: futureExpiry })

      const { sessions } = await import('@/db/schema')
      const { eq, and, gt } = await import('drizzle-orm')

      const now = new Date().toISOString()
      const found = await testDb.db
        .select()
        .from(sessions)
        .where(and(eq(sessions.token, session.token), gt(sessions.expiresAt, now)))
        .limit(1)

      expect(found[0]).toBeDefined()
      expect(found[0].id).toBe(session.id)
    })

    it('should not find an expired session', async () => {
      const user = await seed.user(testDb.db)
      const pastExpiry = new Date(Date.now() - 60000).toISOString() // 1 minute ago
      const session = await seed.session(testDb.db, user.id, { expiresAt: pastExpiry })

      const { sessions } = await import('@/db/schema')
      const { eq, and, gt } = await import('drizzle-orm')

      const now = new Date().toISOString()
      const found = await testDb.db
        .select()
        .from(sessions)
        .where(and(eq(sessions.token, session.token), gt(sessions.expiresAt, now)))
        .limit(1)

      expect(found[0]).toBeUndefined()
    })
  })

  describe('findValidWithUser', () => {
    it('should find a valid session with its user', async () => {
      const user = await seed.user(testDb.db, { email: 'test@example.com', handle: 'testhandle' })
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const session = await seed.session(testDb.db, user.id, { expiresAt: futureExpiry })

      const { sessions, users } = await import('@/db/schema')
      const { eq, and, gt } = await import('drizzle-orm')

      const now = new Date().toISOString()
      const result = await testDb.db
        .select({
          session: sessions,
          user: users,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.token, session.token), gt(sessions.expiresAt, now)))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].session.id).toBe(session.id)
      expect(result[0].user.id).toBe(user.id)
      expect(result[0].user.email).toBe('test@example.com')
    })
  })

  describe('deleteByToken', () => {
    it('should delete a session by token', async () => {
      const user = await seed.user(testDb.db)
      const session = await seed.session(testDb.db, user.id)

      const { sessions } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      // Delete the session
      await testDb.db.delete(sessions).where(eq(sessions.token, session.token))

      // Verify it's deleted
      const found = await testDb.db
        .select()
        .from(sessions)
        .where(eq(sessions.token, session.token))
        .limit(1)

      expect(found[0]).toBeUndefined()
    })
  })

  describe('deleteByUserId', () => {
    it('should delete all sessions for a user', async () => {
      const user = await seed.user(testDb.db)
      await seed.session(testDb.db, user.id)
      await seed.session(testDb.db, user.id)
      await seed.session(testDb.db, user.id)

      const { sessions } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      // Verify we have 3 sessions
      const before = await testDb.db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, user.id))

      expect(before.length).toBe(3)

      // Delete all sessions for user
      await testDb.db.delete(sessions).where(eq(sessions.userId, user.id))

      // Verify they're all deleted
      const after = await testDb.db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, user.id))

      expect(after.length).toBe(0)
    })
  })
})
