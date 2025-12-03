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
      const testDate = new Date('2024-11-11T10:00:00Z')
      const newUser = testFactories.user({
        id: 'user-999',
        handle: 'testuser',
        email: 'test@example.com',
        createdAt: testDate,
        updatedAt: testDate,
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
      // Better Auth uses Date objects for timestamps
      expect(result[0].createdAt.getTime()).toBe(testDate.getTime())
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
    it('should create a user with hashed password in account table', async () => {
      // Better Auth stores passwords in the 'account' table, not the 'user' table
      const db = getDb()
      const passwordHash = await hashPassword('TestPassword123')
      const now = new Date()

      // Create user first
      const userData = testFactories.user({
        id: 'test-user-id',
        handle: 'newuser',
        email: 'new@example.com',
      })
      await db.insert(schema.users).values(userData)

      // Create credential account with password (Better Auth pattern)
      const accountData = {
        id: 'account-test-id',
        accountId: 'test-user-id',
        providerId: 'credential',
        userId: 'test-user-id',
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      }
      await db.insert(betterAuth.account).values(accountData)

      // Verify user was created
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'new@example.com'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].handle).toBe('newuser')

      // Verify password is stored in account table
      const account = await db
        .select()
        .from(betterAuth.account)
        .where(eq(betterAuth.account.userId, 'test-user-id'))
        .limit(1)

      expect(account[0]).toBeDefined()
      expect(account[0].password).toBeDefined()
      expect(account[0].password).not.toBe('TestPassword123')
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

      // Then create user with that PII (Better Auth - no passwordHash on user table)
      const userData = testFactories.user({
        id: 'user-with-pii-id',
        handle: 'userwithpii',
        email: 'withpii@example.com',
        piiId: piiData.id,
      })

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
      // Better Auth stores passwords in account table, not user table
      const db = getDb()
      const password = 'TestPassword123'
      const passwordHash = await hashPassword(password)
      const now = new Date()

      // Create user
      const user = testFactories.user({
        id: 'verify-user-id',
        email: 'verify@example.com',
        isActive: true,
      })
      await db.insert(schema.users).values(user)

      // Create credential account with password
      await db.insert(betterAuth.account).values({
        id: 'verify-account-id',
        accountId: 'verify-user-id',
        providerId: 'credential',
        userId: 'verify-user-id',
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      })

      // Find active user
      const found = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.email, 'verify@example.com'), eq(schema.users.isActive, true)))
        .limit(1)

      expect(found[0]).toBeDefined()

      // Get password from account table
      const account = await db
        .select()
        .from(betterAuth.account)
        .where(eq(betterAuth.account.userId, found[0].id))
        .limit(1)

      expect(account[0]?.password).toBeDefined()

      // Verify password
      const isValid = await verifyPassword(password, account[0].password!)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const db = getDb()
      const passwordHash = await hashPassword('CorrectPassword123')
      const now = new Date()

      const user = testFactories.user({
        id: 'wrongpass-user-id',
        email: 'wrongpass@example.com',
        isActive: true,
      })
      await db.insert(schema.users).values(user)

      await db.insert(betterAuth.account).values({
        id: 'wrongpass-account-id',
        accountId: 'wrongpass-user-id',
        providerId: 'credential',
        userId: 'wrongpass-user-id',
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      })

      const account = await db
        .select()
        .from(betterAuth.account)
        .where(eq(betterAuth.account.userId, 'wrongpass-user-id'))
        .limit(1)

      const isValid = await verifyPassword('WrongPassword123', account[0].password!)
      expect(isValid).toBe(false)
    })

    it('should not find inactive user when searching for active', async () => {
      const db = getDb()

      const user = testFactories.user({
        email: 'inactivelogin@example.com',
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

    it('should handle user without credential account', async () => {
      // Better Auth: user without credential account has no password
      const db = getDb()
      const user = testFactories.user({
        id: 'nopassword-user-id',
        email: 'nopassword@example.com',
        isActive: true,
      })
      await db.insert(schema.users).values(user)

      const found = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'nopassword@example.com'))
        .limit(1)

      expect(found[0]).toBeDefined()

      // No credential account = no password
      const account = await db
        .select()
        .from(betterAuth.account)
        .where(and(eq(betterAuth.account.userId, 'nopassword-user-id'), eq(betterAuth.account.providerId, 'credential')))
        .limit(1)

      expect(account[0]).toBeUndefined()
    })
  })

  describe('updateLastLogin', () => {
    it('should update the lastLoginAt timestamp', async () => {
      const db = getDb()
      const user = testFactories.user({ lastLoginAt: null })
      await db.insert(schema.users).values(user)

      const timestamp = new Date().toISOString()

      // Better Auth uses Date for updatedAt (timestamp_ms mode)
      await db
        .update(schema.users)
        .set({ lastLoginAt: timestamp, updatedAt: new Date() })
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
      const now = new Date()

      // Better Auth: passwords are stored in the account table, not user table
      const user = testFactories.user()
      await db.insert(schema.users).values(user)
      await db.insert(betterAuth.account).values({
        id: `account-${user.id}`,
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: originalHash,
        createdAt: now,
        updatedAt: now,
      })

      // Update password in account table
      const newHash = await hashPassword('NewPassword456')

      await db
        .update(betterAuth.account)
        .set({ password: newHash, updatedAt: new Date() })
        .where(eq(betterAuth.account.userId, user.id))

      // Verify old password no longer works
      const updatedAccount = await db
        .select()
        .from(betterAuth.account)
        .where(eq(betterAuth.account.userId, user.id))
        .limit(1)

      const oldPasswordValid = await verifyPassword('OriginalPassword123', updatedAccount[0].password!)
      const newPasswordValid = await verifyPassword('NewPassword456', updatedAccount[0].password!)

      expect(oldPasswordValid).toBe(false)
      expect(newPasswordValid).toBe(true)
    })
  })

  describe('updateRole', () => {
    it('should update the user system role', async () => {
      const db = getDb()
      const user = testFactories.user({ role: null })
      await db.insert(schema.users).values(user)

      // Better Auth uses Date for updatedAt (timestamp_ms mode)
      await db
        .update(schema.users)
        .set({ role: 'admin', updatedAt: new Date() })
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

      // Better Auth uses Date for updatedAt (timestamp_ms mode)
      await db
        .update(schema.users)
        .set({ role: null, updatedAt: new Date() })
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

      // Better Auth uses Date for updatedAt (timestamp_ms mode)
      await db
        .update(schema.users)
        .set({ isActive: false, updatedAt: new Date() })
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

      // Better Auth uses Date for updatedAt (timestamp_ms mode)
      await db
        .update(schema.users)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id))

      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(updated[0].isActive).toBe(true)
    })
  })

  describe('updatePiiId', () => {
    it('should link a PII record to a user', async () => {
      const db = getDb()
      // Create user without PII
      const user = testFactories.user({ piiId: null })
      await db.insert(schema.users).values(user)

      // Create PII record
      const piiRecord = testFactories.pii({ name: 'John Doe' })
      await db.insert(schema.pii).values(piiRecord)

      // Update user's piiId
      await db
        .update(schema.users)
        .set({ piiId: piiRecord.id, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id))

      // Verify the link
      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(updated[0].piiId).toBe(piiRecord.id)
    })

    it('should unlink PII record by setting to null', async () => {
      const db = getDb()
      // Create PII record first
      const piiRecord = testFactories.pii({ name: 'Jane Doe' })
      await db.insert(schema.pii).values(piiRecord)

      // Create user with PII linked
      const user = testFactories.user({ piiId: piiRecord.id })
      await db.insert(schema.users).values(user)

      // Verify initial state
      const initial = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)
      expect(initial[0].piiId).toBe(piiRecord.id)

      // Unlink PII
      await db
        .update(schema.users)
        .set({ piiId: null, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id))

      // Verify unlinked
      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(updated[0].piiId).toBeNull()
    })

    it('should update updatedAt timestamp when changing piiId', async () => {
      const db = getDb()
      const originalDate = new Date('2024-01-01T00:00:00Z')
      const user = testFactories.user({ piiId: null, updatedAt: originalDate })
      await db.insert(schema.users).values(user)

      const piiRecord = testFactories.pii({ name: 'Test User' })
      await db.insert(schema.pii).values(piiRecord)

      const newDate = new Date('2024-06-01T00:00:00Z')
      await db
        .update(schema.users)
        .set({ piiId: piiRecord.id, updatedAt: newDate })
        .where(eq(schema.users.id, user.id))

      const updated = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(updated[0].updatedAt.getTime()).toBe(newDate.getTime())
    })
  })

  describe('createPiiRecord', () => {
    it('should create a new PII record with name', async () => {
      const db = getDb()
      const timestamp = new Date().toISOString()

      const piiData = {
        id: 'pii-new-id',
        name: 'New Person',
        phone: null,
        address: null,
        notes: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await db.insert(schema.pii).values(piiData)

      const result = await db
        .select()
        .from(schema.pii)
        .where(eq(schema.pii.id, 'pii-new-id'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].name).toBe('New Person')
      expect(result[0].phone).toBeNull()
      expect(result[0].address).toBeNull()
      expect(result[0].notes).toBeNull()
    })

    it('should create PII record with all fields', async () => {
      const db = getDb()
      const timestamp = new Date().toISOString()

      const piiData = {
        id: 'pii-full-id',
        name: 'Full Person',
        phone: '+1234567890',
        address: '123 Main St',
        notes: 'Some notes',
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await db.insert(schema.pii).values(piiData)

      const result = await db
        .select()
        .from(schema.pii)
        .where(eq(schema.pii.id, 'pii-full-id'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].name).toBe('Full Person')
      expect(result[0].phone).toBe('+1234567890')
      expect(result[0].address).toBe('123 Main St')
      expect(result[0].notes).toBe('Some notes')
    })

    it('should allow linking created PII record to a user', async () => {
      const db = getDb()
      const timestamp = new Date().toISOString()

      // Create PII record
      const piiData = {
        id: 'pii-link-id',
        name: 'Linkable Person',
        phone: null,
        address: null,
        notes: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      await db.insert(schema.pii).values(piiData)

      // Create user and link PII
      const user = testFactories.user({ piiId: 'pii-link-id' })
      await db.insert(schema.users).values(user)

      // Verify the link via join
      const result = await db
        .select({
          user: schema.users,
          pii: schema.pii,
        })
        .from(schema.users)
        .leftJoin(schema.pii, eq(schema.users.piiId, schema.pii.id))
        .where(eq(schema.users.id, user.id))
        .limit(1)

      expect(result[0].user.id).toBe(user.id)
      expect(result[0].pii).toBeDefined()
      expect(result[0].pii?.name).toBe('Linkable Person')
    })
  })
})

// Import schema and eq for direct database queries
import * as schema from '@/db/schema'
import * as betterAuth from '@/db/better-auth-schema'
import { eq, and } from 'drizzle-orm'
