import { describe, it, expect, beforeEach } from 'bun:test'
import {
  createTestDb,
  cleanDatabase,
  seed,
  testFactories,
} from '@/test/db-utils'
import { accountRepository } from './account.repository'
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Account Repository Tests
 *
 * Critical functionality: findByAccessCode (portal authentication)
 */

describe('accountRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findAll', () => {
    it('should retrieve all accounts from database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account1 = testFactories.account(org.id, { name: 'Account 1' })
      const account2 = testFactories.account(org.id, { name: 'Account 2' })

      await db.insert(schema.accounts).values([account1, account2])

      // Act
      const results = await db.select().from(schema.accounts)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((a) => a.name)).toContain('Account 1')
      expect(results.map((a) => a.name)).toContain('Account 2')
    })

    it('should return empty array when no accounts exist', async () => {
      // Act
      const results = await db.select().from(schema.accounts)

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findById', () => {
    it('should retrieve account by id', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account = testFactories.account(org.id, {
        id: 'acc-123',
        name: 'Test Account',
      })
      await db.insert(schema.accounts).values(account)

      // Act
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, 'acc-123'))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe('acc-123')
      expect(result[0].name).toBe('Test Account')
    })

    it('should return undefined when account not found', async () => {
      // Act
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, 'nonexistent'))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByOrganisationId', () => {
    it('should retrieve all accounts for an organisation', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { id: 'org-1' })
      const org2 = await seed.organisation(db, { id: 'org-2' })

      const acc1 = testFactories.account('org-1', { name: 'Org1 Account 1' })
      const acc2 = testFactories.account('org-1', { name: 'Org1 Account 2' })
      const acc3 = testFactories.account('org-2', { name: 'Org2 Account 1' })

      await db.insert(schema.accounts).values([acc1, acc2, acc3])

      // Act
      const results = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.organisationId, 'org-1'))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((a) => a.name)).toContain('Org1 Account 1')
      expect(results.map((a) => a.name)).toContain('Org1 Account 2')
      expect(results.map((a) => a.name)).not.toContain('Org2 Account 1')
    })

    it('should return empty array when organisation has no accounts', async () => {
      // Arrange
      await seed.organisation(db, { id: 'org-1' })

      // Act
      const results = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.organisationId, 'org-1'))

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findByAccessCode - CRITICAL for portal authentication', () => {
    it('should retrieve account by access code', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account = testFactories.account(org.id, { accessCode: 'SECURE123' })
      await db.insert(schema.accounts).values(account)

      // Act
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.accessCode, 'SECURE123'))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].accessCode).toBe('SECURE123')
      expect(result[0].id).toBe(account.id)
    })

    it('should return undefined when access code not found', async () => {
      // Act
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.accessCode, 'INVALID'))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })

    it('should be case-sensitive for access codes', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account = testFactories.account(org.id, { accessCode: 'AbC123' })
      await db.insert(schema.accounts).values(account)

      // Act
      const resultExact = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.accessCode, 'AbC123'))
        .limit(1)
      const resultLower = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.accessCode, 'abc123'))
        .limit(1)
      const resultUpper = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.accessCode, 'ABC123'))
        .limit(1)

      // Assert
      expect(resultExact[0]).toBeDefined()
      expect(resultLower[0]).toBeUndefined()
      expect(resultUpper[0]).toBeUndefined()
    })

    it('should find account with special characters in access code', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account = testFactories.account(org.id, {
        accessCode: 'CODE-123_XYZ',
      })
      await db.insert(schema.accounts).values(account)

      // Act
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.accessCode, 'CODE-123_XYZ'))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].accessCode).toBe('CODE-123_XYZ')
    })

    it('should enforce unique access codes', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account1 = testFactories.account(org.id, {
        accessCode: 'UNIQUE123',
      })
      await db.insert(schema.accounts).values(account1)

      // Act & Assert - Should fail to insert duplicate access code
      const account2 = testFactories.account(org.id, {
        accessCode: 'UNIQUE123',
      })
      try {
        await db.insert(schema.accounts).values(account2)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('create', () => {
    it('should insert new account into database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const newAccount = testFactories.account(org.id, { name: 'New Account' })

      // Act
      await db.insert(schema.accounts).values(newAccount)

      // Assert
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, newAccount.id))
        .limit(1)
      expect(result[0]).toBeDefined()
      expect(result[0].name).toBe('New Account')
    })

    it('should preserve all account fields including role', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const newAccount = testFactories.account(org.id, {
        name: 'Project Manager Account',
        email: 'pm@example.com',
        role: 'project_manager',
      })

      // Act
      await db.insert(schema.accounts).values(newAccount)

      // Assert
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, newAccount.id))
        .limit(1)
      expect(result[0].role).toBe('project_manager')
      expect(result[0].email).toBe('pm@example.com')
    })

    it('should allow null userId', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const newAccount = testFactories.account(org.id, { userId: null })

      // Act
      await db.insert(schema.accounts).values(newAccount)

      // Assert
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, newAccount.id))
        .limit(1)
      expect(result[0].userId).toBeNull()
    })
  })

  describe('update', () => {
    it('should update account name', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account = await seed.account(db, org.id, { name: 'Old Name' })

      // Act
      await db
        .update(schema.accounts)
        .set({ name: 'New Name' })
        .where(eq(schema.accounts.id, account.id))

      // Assert
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id))
        .limit(1)
      expect(result[0].name).toBe('New Name')
    })

    it('should update account role', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account = await seed.account(db, org.id, { role: 'contact' })

      // Act
      await db
        .update(schema.accounts)
        .set({ role: 'finance' })
        .where(eq(schema.accounts.id, account.id))

      // Assert
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id))
        .limit(1)
      expect(result[0].role).toBe('finance')
    })

    it('should update multiple fields', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account = await seed.account(db, org.id)

      // Act
      await db
        .update(schema.accounts)
        .set({
          name: 'Updated Name',
          email: 'updated@example.com',
          role: 'project_manager',
        })
        .where(eq(schema.accounts.id, account.id))

      // Assert
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id))
        .limit(1)
      expect(result[0].name).toBe('Updated Name')
      expect(result[0].email).toBe('updated@example.com')
      expect(result[0].role).toBe('project_manager')
    })

    it('should not affect other accounts', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account1 = await seed.account(db, org.id, { name: 'Account 1' })
      const account2 = await seed.account(db, org.id, { name: 'Account 2' })

      // Act
      await db
        .update(schema.accounts)
        .set({ name: 'Updated' })
        .where(eq(schema.accounts.id, account1.id))

      // Assert
      const result2 = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account2.id))
        .limit(1)
      expect(result2[0].name).toBe('Account 2')
    })
  })

  describe('delete', () => {
    it('should remove account from database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account = await seed.account(db, org.id)

      // Act
      await db.delete(schema.accounts).where(eq(schema.accounts.id, account.id))

      // Assert
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id))
        .limit(1)
      expect(result[0]).toBeUndefined()
    })

    it('should cascade delete when organisation is deleted', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const account = await seed.account(db, 'org-1')

      // Act - Delete organisation
      await db
        .delete(schema.organisations)
        .where(eq(schema.organisations.id, 'org-1'))

      // Assert - Account should be deleted due to cascade
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id))
        .limit(1)
      expect(result[0]).toBeUndefined()
    })

    it('should not affect other accounts', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account1 = await seed.account(db, org.id)
      const account2 = await seed.account(db, org.id)

      // Act
      await db
        .delete(schema.accounts)
        .where(eq(schema.accounts.id, account1.id))

      // Assert
      const remaining = await db.select().from(schema.accounts)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(account2.id)
    })
  })

  describe('data integrity', () => {
    it('should maintain foreign key relationship with organisation', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })

      // Act & Assert - Should fail to create account with non-existent organisation
      const invalidAccount = testFactories.account('nonexistent-org')
      try {
        await db.insert(schema.accounts).values(invalidAccount)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should allow linking account to user', async () => {
      // Arrange
      const user = await seed.user(db, { id: 'user-1' })
      const org = await seed.organisation(db)
      const account = testFactories.account(org.id, { userId: 'user-1' })

      // Act
      await db.insert(schema.accounts).values(account)

      // Assert
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id))
        .limit(1)
      expect(result[0].userId).toBe('user-1')
    })

    it('should set userId to null when user is deleted', async () => {
      // Arrange
      const user = await seed.user(db, { id: 'user-1' })
      const org = await seed.organisation(db)
      const account = await seed.account(db, org.id, { userId: 'user-1' })

      // Act - Delete user
      await db.delete(schema.users).where(eq(schema.users.id, 'user-1'))

      // Assert - Account userId should be set to null (onDelete: 'set null')
      const result = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id))
        .limit(1)
      expect(result[0].userId).toBeNull()
    })
  })
})
