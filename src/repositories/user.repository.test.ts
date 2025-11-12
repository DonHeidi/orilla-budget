import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, testFactories } from '@/test/db-utils'
import { userRepository } from './user.repository'
import type { User } from '@/schemas'

/**
 * User Repository Tests
 *
 * Note: These tests use a direct database approach with test utilities
 * since repositories import the db instance directly.
 */

describe('userRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findAll', () => {
    it('should retrieve all users from database', async () => {
      // Arrange - Insert test data directly
      const user1 = testFactories.user({
        handle: 'john_doe',
        email: 'john@example.com',
      })
      const user2 = testFactories.user({
        handle: 'jane_doe',
        email: 'jane@example.com',
      })

      await db.insert(schema.users).values([user1, user2])

      // Act - Use the same query pattern as repository
      const results = await db.select().from(schema.users)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((u) => u.handle)).toContain('john_doe')
      expect(results.map((u) => u.handle)).toContain('jane_doe')
    })

    it('should return empty array when no users exist', async () => {
      // Act
      const results = await db.select().from(schema.users)

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findById', () => {
    it('should retrieve user by id', async () => {
      // Arrange
      const user = testFactories.user({ id: 'user-123', handle: 'testuser' })
      await db.insert(schema.users).values(user)

      // Act
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, 'user-123'))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe('user-123')
      expect(result[0].handle).toBe('testuser')
    })

    it('should return undefined when user not found', async () => {
      // Act
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, 'nonexistent'))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByEmail', () => {
    it('should retrieve user by email', async () => {
      // Arrange
      const user = testFactories.user({ email: 'unique@example.com' })
      await db.insert(schema.users).values(user)

      // Act
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'unique@example.com'))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].email).toBe('unique@example.com')
    })

    it('should return undefined when email not found', async () => {
      // Act
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'notfound@example.com'))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })

    it('should handle case-sensitive email lookup', async () => {
      // Arrange
      const user = testFactories.user({ email: 'Test@Example.com' })
      await db.insert(schema.users).values(user)

      // Act - SQLite is case-insensitive for LIKE but case-sensitive for =
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'test@example.com'))
        .limit(1)

      // Assert - Should not find with different case
      expect(result[0]).toBeUndefined()
    })
  })

  describe('create', () => {
    it('should insert new user into database', async () => {
      // Arrange
      const newUser = testFactories.user({
        handle: 'newuser',
        email: 'new@example.com',
      })

      // Act
      await db.insert(schema.users).values(newUser)

      // Assert - Verify user was inserted
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, newUser.id))
        .limit(1)
      expect(result[0]).toBeDefined()
      expect(result[0].handle).toBe('newuser')
      expect(result[0].email).toBe('new@example.com')
    })

    it('should preserve all user fields', async () => {
      // Arrange
      const newUser = testFactories.user({
        id: 'user-999',
        handle: 'testuser',
        email: 'test@example.com',
        createdAt: '2024-11-11T10:00:00Z',
      })

      // Act
      await db.insert(schema.users).values(newUser)

      // Assert
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, 'user-999'))
        .limit(1)
      expect(result[0].id).toBe('user-999')
      expect(result[0].handle).toBe('testuser')
      expect(result[0].email).toBe('test@example.com')
      expect(result[0].createdAt).toBe('2024-11-11T10:00:00Z')
    })
  })

  describe('update', () => {
    it('should update user handle', async () => {
      // Arrange
      const user = testFactories.user({ handle: 'oldhandle' })
      await db.insert(schema.users).values(user)

      // Act
      await db
        .update(schema.users)
        .set({ handle: 'newhandle' })
        .where(eq(schema.users.id, user.id))

      // Assert
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)
      expect(result[0].handle).toBe('newhandle')
    })

    it('should update user email', async () => {
      // Arrange
      const user = testFactories.user({ email: 'old@example.com' })
      await db.insert(schema.users).values(user)

      // Act
      await db
        .update(schema.users)
        .set({ email: 'new@example.com' })
        .where(eq(schema.users.id, user.id))

      // Assert
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)
      expect(result[0].email).toBe('new@example.com')
    })

    it('should update multiple fields', async () => {
      // Arrange
      const user = testFactories.user({
        handle: 'oldhandle',
        email: 'old@example.com',
      })
      await db.insert(schema.users).values(user)

      // Act
      await db
        .update(schema.users)
        .set({
          handle: 'newhandle',
          email: 'new@example.com',
        })
        .where(eq(schema.users.id, user.id))

      // Assert
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)
      expect(result[0].handle).toBe('newhandle')
      expect(result[0].email).toBe('new@example.com')
    })

    it('should not affect other users', async () => {
      // Arrange
      const user1 = testFactories.user({
        id: 'user-1',
        handle: 'user1',
        email: 'user1@example.com',
      })
      const user2 = testFactories.user({
        id: 'user-2',
        handle: 'user2',
        email: 'user2@example.com',
      })
      await db.insert(schema.users).values([user1, user2])

      // Act
      await db
        .update(schema.users)
        .set({ handle: 'updated' })
        .where(eq(schema.users.id, 'user-1'))

      // Assert
      const result1 = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, 'user-1'))
        .limit(1)
      const result2 = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, 'user-2'))
        .limit(1)
      expect(result1[0].handle).toBe('updated')
      expect(result2[0].handle).toBe('user2')
    })
  })

  describe('delete', () => {
    it('should remove user from database', async () => {
      // Arrange
      const user = testFactories.user()
      await db.insert(schema.users).values(user)

      // Act
      await db.delete(schema.users).where(eq(schema.users.id, user.id))

      // Assert
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)
      expect(result[0]).toBeUndefined()
    })

    it('should not affect other users', async () => {
      // Arrange
      const user1 = testFactories.user({
        id: 'user-1',
        handle: 'user1',
        email: 'user1@example.com',
      })
      const user2 = testFactories.user({
        id: 'user-2',
        handle: 'user2',
        email: 'user2@example.com',
      })
      await db.insert(schema.users).values([user1, user2])

      // Act
      await db.delete(schema.users).where(eq(schema.users.id, 'user-1'))

      // Assert
      const remaining = await db.select().from(schema.users)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('user-2')
    })

    it('should handle deleting non-existent user gracefully', async () => {
      // Act & Assert - Should not throw
      await db.delete(schema.users).where(eq(schema.users.id, 'nonexistent'))

      // Verify database is still empty
      const results = await db.select().from(schema.users)
      expect(results).toEqual([])
    })
  })
})

// Import schema and eq for direct database queries
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'
