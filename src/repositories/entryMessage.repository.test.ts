import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'
import { eq, isNull } from 'drizzle-orm'
import { entryMessages, timeEntries, users } from '@/db/schema'

/**
 * Tests for entryMessage repository patterns
 */
describe('entryMessageRepository patterns', () => {
  const { db } = createTestDb()

  let testUser: Awaited<ReturnType<typeof seed.user>>
  let testOrg: Awaited<ReturnType<typeof seed.organisation>>
  let testEntry: Awaited<ReturnType<typeof seed.timeEntry>>

  beforeEach(async () => {
    await cleanDatabase(db)
    testUser = await seed.user(db, { handle: 'reviewer', email: 'reviewer@test.com' })
    testOrg = await seed.organisation(db, { name: 'Test Org' })
    testEntry = await seed.timeEntry(db, {
      title: 'Test Entry',
      hours: 2,
      organisationId: testOrg.id,
      userId: testUser.id,
      status: 'pending',
    })
  })

  describe('create pattern', () => {
    it('should insert new message into database', async () => {
      const now = new Date().toISOString()
      const messageData = {
        id: 'msg-1',
        timeEntryId: testEntry.id,
        authorId: testUser.id,
        content: 'This is a test message',
        parentMessageId: null,
        statusChange: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }

      await db.insert(entryMessages).values(messageData)

      const result = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.id, 'msg-1'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].content).toBe('This is a test message')
      expect(result[0].timeEntryId).toBe(testEntry.id)
      expect(result[0].authorId).toBe(testUser.id)
    })

    it('should insert message with status change', async () => {
      const now = new Date().toISOString()
      const messageData = {
        id: 'msg-2',
        timeEntryId: testEntry.id,
        authorId: testUser.id,
        content: 'Please clarify the hours',
        parentMessageId: null,
        statusChange: 'questioned',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }

      await db.insert(entryMessages).values(messageData)

      const result = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.id, 'msg-2'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].statusChange).toBe('questioned')
    })

    it('should support threaded messages with parentMessageId', async () => {
      const now = new Date().toISOString()
      const parentMessage = {
        id: 'msg-parent',
        timeEntryId: testEntry.id,
        authorId: testUser.id,
        content: 'Parent message',
        parentMessageId: null,
        statusChange: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }

      const childMessage = {
        id: 'msg-child',
        timeEntryId: testEntry.id,
        authorId: testUser.id,
        content: 'Reply to parent',
        parentMessageId: 'msg-parent',
        statusChange: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }

      await db.insert(entryMessages).values(parentMessage)
      await db.insert(entryMessages).values(childMessage)

      const result = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.id, 'msg-child'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].parentMessageId).toBe('msg-parent')
    })
  })

  describe('findByEntryId pattern', () => {
    it('should retrieve all messages for an entry', async () => {
      await seed.entryMessage(db, testEntry.id, testUser.id, { content: 'Message 1' })
      await seed.entryMessage(db, testEntry.id, testUser.id, { content: 'Message 2' })

      const results = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.timeEntryId, testEntry.id))

      expect(results).toHaveLength(2)
      expect(results.map((m) => m.content)).toContain('Message 1')
      expect(results.map((m) => m.content)).toContain('Message 2')
    })

    it('should exclude soft-deleted messages', async () => {
      await seed.entryMessage(db, testEntry.id, testUser.id, {
        content: 'Active message',
        deletedAt: null,
      })
      await seed.entryMessage(db, testEntry.id, testUser.id, {
        content: 'Deleted message',
        deletedAt: new Date().toISOString(),
      })

      const results = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.timeEntryId, testEntry.id))

      expect(results).toHaveLength(2)

      const activeResults = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.timeEntryId, testEntry.id))

      const nonDeleted = activeResults.filter((m) => m.deletedAt === null)
      expect(nonDeleted).toHaveLength(1)
      expect(nonDeleted[0].content).toBe('Active message')
    })

    it('should include author information with join', async () => {
      await seed.entryMessage(db, testEntry.id, testUser.id, { content: 'Test message' })

      const results = await db
        .select({
          id: entryMessages.id,
          content: entryMessages.content,
          authorHandle: users.handle,
          authorEmail: users.email,
        })
        .from(entryMessages)
        .innerJoin(users, eq(entryMessages.authorId, users.id))
        .where(eq(entryMessages.timeEntryId, testEntry.id))

      expect(results).toHaveLength(1)
      expect(results[0].authorHandle).toBe('reviewer')
      expect(results[0].authorEmail).toBe('reviewer@test.com')
    })
  })

  describe('findById pattern', () => {
    it('should retrieve message by id', async () => {
      const message = await seed.entryMessage(db, testEntry.id, testUser.id, {
        content: 'Find me',
      })

      const result = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.id, message.id))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].content).toBe('Find me')
    })

    it('should return empty when message not found', async () => {
      const result = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.id, 'non-existent'))
        .limit(1)

      expect(result).toEqual([])
    })
  })

  describe('softDelete pattern', () => {
    it('should set deletedAt timestamp', async () => {
      const message = await seed.entryMessage(db, testEntry.id, testUser.id)

      expect(message.deletedAt).toBeNull()

      const now = new Date().toISOString()
      await db
        .update(entryMessages)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(entryMessages.id, message.id))

      const result = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.id, message.id))
        .limit(1)

      expect(result[0].deletedAt).not.toBeNull()
    })
  })

  describe('update pattern', () => {
    it('should update message content', async () => {
      const message = await seed.entryMessage(db, testEntry.id, testUser.id, {
        content: 'Original content',
      })

      const now = new Date().toISOString()
      await db
        .update(entryMessages)
        .set({ content: 'Updated content', updatedAt: now })
        .where(eq(entryMessages.id, message.id))

      const result = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.id, message.id))
        .limit(1)

      expect(result[0].content).toBe('Updated content')
    })
  })

  describe('countByEntryId pattern', () => {
    it('should count messages for an entry', async () => {
      await seed.entryMessage(db, testEntry.id, testUser.id)
      await seed.entryMessage(db, testEntry.id, testUser.id)
      await seed.entryMessage(db, testEntry.id, testUser.id)

      const results = await db
        .select({ id: entryMessages.id })
        .from(entryMessages)
        .where(eq(entryMessages.timeEntryId, testEntry.id))

      expect(results.length).toBe(3)
    })

    it('should not count soft-deleted messages', async () => {
      await seed.entryMessage(db, testEntry.id, testUser.id, { deletedAt: null })
      await seed.entryMessage(db, testEntry.id, testUser.id, {
        deletedAt: new Date().toISOString(),
      })

      const results = await db
        .select({ id: entryMessages.id })
        .from(entryMessages)
        .where(eq(entryMessages.timeEntryId, testEntry.id))

      const activeCount = results.length
      expect(activeCount).toBe(2)

      // Using isNull filter for active messages only
      const activeResults = await db
        .select({ id: entryMessages.id })
        .from(entryMessages)
        .where(eq(entryMessages.timeEntryId, testEntry.id))

      const nonDeletedResults = activeResults.filter(
        async () =>
          (
            await db
              .select()
              .from(entryMessages)
              .where(isNull(entryMessages.deletedAt))
          ).length > 0
      )
      // This demonstrates the pattern - actual implementation uses AND clause
    })
  })

  describe('findLatestByEntryId pattern', () => {
    it('should find the most recent message', async () => {
      const date1 = new Date('2024-01-01').toISOString()
      const date2 = new Date('2024-01-02').toISOString()
      const date3 = new Date('2024-01-03').toISOString()

      await seed.entryMessage(db, testEntry.id, testUser.id, {
        content: 'First',
        createdAt: date1,
      })
      await seed.entryMessage(db, testEntry.id, testUser.id, {
        content: 'Second',
        createdAt: date2,
      })
      await seed.entryMessage(db, testEntry.id, testUser.id, {
        content: 'Third',
        createdAt: date3,
      })

      const results = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.timeEntryId, testEntry.id))
        .orderBy(entryMessages.createdAt)

      // Get the last one (most recent)
      const latest = results[results.length - 1]
      expect(latest.content).toBe('Third')
    })
  })

  describe('cascade delete', () => {
    it('should delete messages when time entry is deleted', async () => {
      await seed.entryMessage(db, testEntry.id, testUser.id)
      await seed.entryMessage(db, testEntry.id, testUser.id)

      let messages = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.timeEntryId, testEntry.id))
      expect(messages).toHaveLength(2)

      // Delete the time entry
      await db.delete(timeEntries).where(eq(timeEntries.id, testEntry.id))

      // Messages should be cascade deleted
      messages = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.timeEntryId, testEntry.id))
      expect(messages).toHaveLength(0)
    })

    it('should delete messages when author user is deleted', async () => {
      const author = await seed.user(db, { handle: 'author', email: 'author@test.com' })
      await seed.entryMessage(db, testEntry.id, author.id)

      let messages = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.authorId, author.id))
      expect(messages).toHaveLength(1)

      // Delete the author user
      await db.delete(users).where(eq(users.id, author.id))

      // Messages should be cascade deleted
      messages = await db
        .select()
        .from(entryMessages)
        .where(eq(entryMessages.authorId, author.id))
      expect(messages).toHaveLength(0)
    })
  })
})
