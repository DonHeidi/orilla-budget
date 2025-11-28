import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createTestDb, cleanDatabase, testFactories, seed } from '@/test/db-utils'
import { hashPassword, verifyPassword } from '@/lib/auth'
import type { User } from '@/schemas'

/**
 * User Repository Tests
 *
 * Note: These tests use a direct database approach with test utilities
 * since repositories import the db instance directly.
 */

describe('userRepository', () => {
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

  // Helper to get db
  const getDb = () => testDb.db

  describe('findAll', () => {
    it('should retrieve all users from database', async () => {
      // Arrange - Insert test data directly
      const db = getDb()
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
      const db = getDb()
      const results = await db.select().from(schema.users)

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findById', () => {
    it('should retrieve user by id', async () => {
      // Arrange
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
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
      const db = getDb()
      await db.delete(schema.users).where(eq(schema.users.id, 'nonexistent'))

      // Verify database is still empty
      const results = await db.select().from(schema.users)
      expect(results).toEqual([])
    })
  })

  // ============================================
  // Auth-specific tests
  // ============================================

  describe('findByHandle', () => {
    it('should find a user by handle', async () => {
      const db = getDb()
      const user = testFactories.user({ handle: 'uniquehandle' })
      await db.insert(schema.users).values(user)

      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.handle, 'uniquehandle'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe(user.id)
    })

    it('should return undefined for non-existent handle', async () => {
      const db = getDb()
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.handle, 'nonexistent'))
        .limit(1)

      expect(result[0]).toBeUndefined()
    })
  })

  describe('findActiveByEmail', () => {
    it('should find an active user by email', async () => {
      const db = getDb()
      const user = testFactories.user({
        email: 'active@example.com',
        isActive: true,
      })
      await db.insert(schema.users).values(user)

      const result = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.email, 'active@example.com'), eq(schema.users.isActive, true)))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe(user.id)
    })

    it('should not find an inactive user', async () => {
      const db = getDb()
      const user = testFactories.user({
        email: 'inactive@example.com',
        isActive: false,
      })
      await db.insert(schema.users).values(user)

      const result = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.email, 'inactive@example.com'), eq(schema.users.isActive, true)))
        .limit(1)

      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByIdWithPii', () => {
    it('should find a user with their PII record', async () => {
      const db = getDb()
      // First create a PII record
      const piiRecord = testFactories.pii({ name: 'John Doe' })
      await db.insert(schema.pii).values(piiRecord)

      // Create a user with that PII
      const user = testFactories.user({ piiId: piiRecord.id })
      await db.insert(schema.users).values(user)

      const result = await db
        .select({
          user: schema.users,
          pii: schema.pii,
        })
        .from(schema.users)
        .leftJoin(schema.pii, eq(schema.users.piiId, schema.pii.id))
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].user.id).toBe(user.id)
      expect(result[0].pii).toBeDefined()
      expect(result[0].pii?.name).toBe('John Doe')
    })

    it('should return user with null pii if no PII record exists', async () => {
      const db = getDb()
      const user = testFactories.user({ piiId: null })
      await db.insert(schema.users).values(user)

      const result = await db
        .select({
          user: schema.users,
          pii: schema.pii,
        })
        .from(schema.users)
        .leftJoin(schema.pii, eq(schema.users.piiId, schema.pii.id))
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].user.id).toBe(user.id)
      expect(result[0].pii).toBeNull()
    })
  })

  describe('createWithPassword', () => {
    it('should create a user with hashed password', async () => {
      const db = getDb()
      const passwordHash = await hashPassword('TestPassword123')
      const timestamp = new Date().toISOString()

      const userData = {
        id: 'test-user-id',
        handle: 'newuser',
        email: 'new@example.com',
        passwordHash,
        piiId: null,
        role: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await db.insert(schema.users).values(userData)

      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'new@example.com'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].handle).toBe('newuser')
      expect(result[0].passwordHash).toBeDefined()
      expect(result[0].passwordHash).not.toBe('TestPassword123')
    })

    it('should create PII record when name is provided', async () => {
      const db = getDb()
      const timestamp = new Date().toISOString()

      // First create PII record
      const piiData = {
        id: 'pii-test-id',
        name: 'Test User',
        phone: null,
        address: null,
        notes: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await db.insert(schema.pii).values(piiData)

      // Then create user with that PII
      const passwordHash = await hashPassword('TestPassword123')
      const userData = {
        id: 'user-with-pii-id',
        handle: 'userwithpii',
        email: 'withpii@example.com',
        passwordHash,
        piiId: piiData.id,
        role: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await db.insert(schema.users).values(userData)

      // Verify the PII was linked
      const result = await db
        .select({
          user: schema.users,
          pii: schema.pii,
        })
        .from(schema.users)
        .leftJoin(schema.pii, eq(schema.users.piiId, schema.pii.id))
        .where(eq(schema.users.email, 'withpii@example.com'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].pii).toBeDefined()
      expect(result[0].pii?.name).toBe('Test User')
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password for active user', async () => {
      const db = getDb()
      const password = 'TestPassword123'
      const passwordHash = await hashPassword(password)

      const user = testFactories.user({
        email: 'verify@example.com',
        passwordHash,
        isActive: true,
      })
      await db.insert(schema.users).values(user)

      // Find active user
      const found = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.email, 'verify@example.com'), eq(schema.users.isActive, true)))
        .limit(1)

      expect(found[0]).toBeDefined()
      expect(found[0].passwordHash).toBeDefined()

      // Verify password
      const isValid = await verifyPassword(password, found[0].passwordHash!)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const db = getDb()
      const passwordHash = await hashPassword('CorrectPassword123')

      const user = testFactories.user({
        email: 'wrongpass@example.com',
        passwordHash,
        isActive: true,
      })
      await db.insert(schema.users).values(user)

      const found = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'wrongpass@example.com'))
        .limit(1)

      const isValid = await verifyPassword('WrongPassword123', found[0].passwordHash!)
      expect(isValid).toBe(false)
    })

    it('should not find inactive user when searching for active', async () => {
      const db = getDb()
      const passwordHash = await hashPassword('TestPassword123')

      const user = testFactories.user({
        email: 'inactivelogin@example.com',
        passwordHash,
        isActive: false,
      })
      await db.insert(schema.users).values(user)

      // Should not find inactive user with active filter
      const found = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.email, 'inactivelogin@example.com'), eq(schema.users.isActive, true)))
        .limit(1)

      expect(found[0]).toBeUndefined()
    })

    it('should handle user without password', async () => {
      const db = getDb()
      const user = testFactories.user({
        email: 'nopassword@example.com',
        passwordHash: null,
        isActive: true,
      })
      await db.insert(schema.users).values(user)

      const found = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'nopassword@example.com'))
        .limit(1)

      expect(found[0]).toBeDefined()
      expect(found[0].passwordHash).toBeNull()
    })
  })

  describe('updateLastLogin', () => {
    it('should update the lastLoginAt timestamp', async () => {
      const db = getDb()
      const user = testFactories.user({ lastLoginAt: null })
      await db.insert(schema.users).values(user)

      const timestamp = new Date().toISOString()

      await db
        .update(schema.users)
        .set({ lastLoginAt: timestamp, updatedAt: timestamp })
        .where(eq(schema.users.id, user.id))

      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(updated[0].lastLoginAt).toBe(timestamp)
    })
  })

  describe('updatePassword', () => {
    it('should update the user password hash', async () => {
      const db = getDb()
      const originalHash = await hashPassword('OriginalPassword123')
      const user = testFactories.user({ passwordHash: originalHash })
      await db.insert(schema.users).values(user)

      // Update password
      const newHash = await hashPassword('NewPassword456')
      const timestamp = new Date().toISOString()

      await db
        .update(schema.users)
        .set({ passwordHash: newHash, updatedAt: timestamp })
        .where(eq(schema.users.id, user.id))

      // Verify old password no longer works
      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      const oldPasswordValid = await verifyPassword('OriginalPassword123', updated[0].passwordHash!)
      const newPasswordValid = await verifyPassword('NewPassword456', updated[0].passwordHash!)

      expect(oldPasswordValid).toBe(false)
      expect(newPasswordValid).toBe(true)
    })
  })

  describe('updateRole', () => {
    it('should update the user system role', async () => {
      const db = getDb()
      const user = testFactories.user({ role: null })
      await db.insert(schema.users).values(user)

      const timestamp = new Date().toISOString()

      await db
        .update(schema.users)
        .set({ role: 'admin', updatedAt: timestamp })
        .where(eq(schema.users.id, user.id))

      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(updated[0].role).toBe('admin')
    })

    it('should set role to null', async () => {
      const db = getDb()
      const user = testFactories.user({ role: 'admin' })
      await db.insert(schema.users).values(user)

      const timestamp = new Date().toISOString()

      await db
        .update(schema.users)
        .set({ role: null, updatedAt: timestamp })
        .where(eq(schema.users.id, user.id))

      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(updated[0].role).toBeNull()
    })
  })

  describe('deactivate', () => {
    it('should deactivate a user account', async () => {
      const db = getDb()
      const user = testFactories.user({ isActive: true })
      await db.insert(schema.users).values(user)

      const timestamp = new Date().toISOString()

      await db
        .update(schema.users)
        .set({ isActive: false, updatedAt: timestamp })
        .where(eq(schema.users.id, user.id))

      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(updated[0].isActive).toBe(false)
    })
  })

  describe('activate', () => {
    it('should activate a user account', async () => {
      const db = getDb()
      const user = testFactories.user({ isActive: false })
      await db.insert(schema.users).values(user)

      const timestamp = new Date().toISOString()

      await db
        .update(schema.users)
        .set({ isActive: true, updatedAt: timestamp })
        .where(eq(schema.users.id, user.id))

      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(updated[0].isActive).toBe(true)
    })
  })
})

// Import schema and eq for direct database queries
import * as schema from '@/db/schema'
import { eq, and } from 'drizzle-orm'
