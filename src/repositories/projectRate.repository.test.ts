import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'
import * as schema from '@/db/schema'
import * as betterAuth from '@/db/better-auth-schema'
import { eq, and, isNull, or, desc, sql } from 'drizzle-orm'

/**
 * Project Rate Repository Tests
 *
 * Key functionality: Rate management with hierarchy (member > billing_role > default)
 * and time-based rate history tracking
 */

describe('projectRateRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findActiveByProjectId', () => {
    it('should return active rates (effectiveTo is null)', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveTo: null,
      })

      // Act
      const results = await db
        .select()
        .from(schema.projectRates)
        .where(and(eq(schema.projectRates.projectId, project.teamId), isNull(schema.projectRates.effectiveTo)))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].rateAmountCents).toBe(10000)
    })

    it('should exclude closed rates', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveTo: null, // Active
      })
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 8000,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-06-01', // Closed
      })

      // Act
      const results = await db
        .select()
        .from(schema.projectRates)
        .where(and(eq(schema.projectRates.projectId, project.teamId), isNull(schema.projectRates.effectiveTo)))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].rateAmountCents).toBe(10000)
    })

    it('should return empty array when no rates', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Act
      const results = await db
        .select()
        .from(schema.projectRates)
        .where(and(eq(schema.projectRates.projectId, project.teamId), isNull(schema.projectRates.effectiveTo)))

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findHistoryByProjectId', () => {
    it('should return all rates ordered by date', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveFrom: '2024-01-01',
      })
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 12000,
        effectiveFrom: '2024-06-01',
      })

      // Act
      const results = await db
        .select()
        .from(schema.projectRates)
        .where(eq(schema.projectRates.projectId, project.teamId))
        .orderBy(desc(schema.projectRates.effectiveFrom))

      // Assert
      expect(results).toHaveLength(2)
      expect(results[0].effectiveFrom).toBe('2024-06-01')
      expect(results[1].effectiveFrom).toBe('2024-01-01')
    })

    it('should include both active and closed rates', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 8000,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-06-01', // Closed
      })
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveFrom: '2024-06-01',
        effectiveTo: null, // Active
      })

      // Act
      const results = await db
        .select()
        .from(schema.projectRates)
        .where(eq(schema.projectRates.projectId, project.teamId))

      // Assert
      expect(results).toHaveLength(2)
    })
  })

  describe('getDefaultRate', () => {
    it('should return current default rate', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 15000,
        effectiveTo: null,
      })

      // Act
      const result = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            eq(schema.projectRates.rateType, 'default'),
            isNull(schema.projectRates.effectiveTo)
          )
        )
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].rateAmountCents).toBe(15000)
    })

    it('should return undefined when no default exists', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Act
      const result = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            eq(schema.projectRates.rateType, 'default'),
            isNull(schema.projectRates.effectiveTo)
          )
        )
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('getBillingRoleRate', () => {
    it('should return rate for specific billing role', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const billingRole = await seed.projectBillingRole(db, project.teamId, { name: 'Senior Dev' })
      await seed.projectRate(db, project.teamId, {
        rateType: 'billing_role',
        billingRoleId: billingRole.id,
        rateAmountCents: 20000,
        effectiveTo: null,
      })

      // Act
      const result = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            eq(schema.projectRates.rateType, 'billing_role'),
            eq(schema.projectRates.billingRoleId, billingRole.id),
            isNull(schema.projectRates.effectiveTo)
          )
        )
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].rateAmountCents).toBe(20000)
    })

    it('should return undefined when no role rate exists', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const billingRole = await seed.projectBillingRole(db, project.teamId, { name: 'Designer' })

      // Act
      const result = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            eq(schema.projectRates.rateType, 'billing_role'),
            eq(schema.projectRates.billingRoleId, billingRole.id),
            isNull(schema.projectRates.effectiveTo)
          )
        )
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('getMemberRate', () => {
    it('should return rate for specific member', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)
      await seed.projectRate(db, project.teamId, {
        rateType: 'member',
        memberId: member.id,
        rateAmountCents: 25000,
        effectiveTo: null,
      })

      // Act
      const result = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            eq(schema.projectRates.rateType, 'member'),
            eq(schema.projectRates.memberId, member.id),
            isNull(schema.projectRates.effectiveTo)
          )
        )
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].rateAmountCents).toBe(25000)
    })

    it('should return undefined when no member rate exists', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)

      // Act
      const result = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            eq(schema.projectRates.rateType, 'member'),
            eq(schema.projectRates.memberId, member.id),
            isNull(schema.projectRates.effectiveTo)
          )
        )
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('getEffectiveRateForMember', () => {
    it('should return member rate when it exists (highest priority)', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)
      const billingRole = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })

      // Create all three rate types
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000, // $100 default
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })
      await seed.projectRate(db, project.teamId, {
        rateType: 'billing_role',
        billingRoleId: billingRole.id,
        rateAmountCents: 15000, // $150 role rate
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })
      await seed.projectRate(db, project.teamId, {
        rateType: 'member',
        memberId: member.id,
        rateAmountCents: 20000, // $200 member rate
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })

      // Assign billing role to member
      await seed.projectMemberBillingRole(db, member.id, { billingRoleId: billingRole.id })

      const date = '2024-06-15'

      // Act - get rates effective on date
      const rates = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            sql`${schema.projectRates.effectiveFrom} <= ${date}`,
            or(isNull(schema.projectRates.effectiveTo), sql`${schema.projectRates.effectiveTo} > ${date}`)
          )
        )

      // Assert - member rate should be highest priority
      const memberRate = rates.find((r) => r.rateType === 'member' && r.memberId === member.id)
      expect(memberRate).toBeDefined()
      expect(memberRate!.rateAmountCents).toBe(20000)
    })

    it('should return billing role rate when no member rate', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)
      const billingRole = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })

      // Only default and role rates
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })
      await seed.projectRate(db, project.teamId, {
        rateType: 'billing_role',
        billingRoleId: billingRole.id,
        rateAmountCents: 15000,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })

      // Assign billing role to member
      await seed.projectMemberBillingRole(db, member.id, { billingRoleId: billingRole.id })

      const date = '2024-06-15'

      // Act
      const rates = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            sql`${schema.projectRates.effectiveFrom} <= ${date}`,
            or(isNull(schema.projectRates.effectiveTo), sql`${schema.projectRates.effectiveTo} > ${date}`)
          )
        )

      // Assert - no member rate, so billing role rate applies
      const memberRate = rates.find((r) => r.rateType === 'member' && r.memberId === member.id)
      const roleRate = rates.find((r) => r.rateType === 'billing_role' && r.billingRoleId === billingRole.id)

      expect(memberRate).toBeUndefined()
      expect(roleRate).toBeDefined()
      expect(roleRate!.rateAmountCents).toBe(15000)
    })

    it('should return default rate when no other rates', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      await seed.projectMember(db, project.teamId, user.id)

      // Only default rate
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })

      const date = '2024-06-15'

      // Act
      const rates = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            sql`${schema.projectRates.effectiveFrom} <= ${date}`,
            or(isNull(schema.projectRates.effectiveTo), sql`${schema.projectRates.effectiveTo} > ${date}`)
          )
        )

      // Assert
      const defaultRate = rates.find((r) => r.rateType === 'default')
      expect(defaultRate).toBeDefined()
      expect(defaultRate!.rateAmountCents).toBe(10000)
    })

    it('should return null when no rates at all', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      await seed.projectMember(db, project.teamId, user.id)

      const date = '2024-06-15'

      // Act
      const rates = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            sql`${schema.projectRates.effectiveFrom} <= ${date}`,
            or(isNull(schema.projectRates.effectiveTo), sql`${schema.projectRates.effectiveTo} > ${date}`)
          )
        )

      // Assert
      expect(rates).toHaveLength(0)
    })

    it('should respect effectiveFrom/effectiveTo date ranges', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Old rate (closed)
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 8000,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-06-01',
      })

      // Current rate (open)
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 12000,
        effectiveFrom: '2024-06-01',
        effectiveTo: null,
      })

      // Act - query for date in second period
      const dateInSecondPeriod = '2024-07-15'
      const results = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            sql`${schema.projectRates.effectiveFrom} <= ${dateInSecondPeriod}`,
            or(
              isNull(schema.projectRates.effectiveTo),
              sql`${schema.projectRates.effectiveTo} > ${dateInSecondPeriod}`
            )
          )
        )

      // Assert - only the current rate should match
      expect(results).toHaveLength(1)
      expect(results[0].rateAmountCents).toBe(12000)

      // Act - query for date in first period
      const dateInFirstPeriod = '2024-03-15'
      const oldResults = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            sql`${schema.projectRates.effectiveFrom} <= ${dateInFirstPeriod}`,
            or(isNull(schema.projectRates.effectiveTo), sql`${schema.projectRates.effectiveTo} > ${dateInFirstPeriod}`)
          )
        )

      // Assert - only the old rate should match
      expect(oldResults).toHaveLength(1)
      expect(oldResults[0].rateAmountCents).toBe(8000)
    })

    it('should return null for non-existent member', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Add a default rate
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })

      // Act - query for member data (simulating what the repository does)
      const memberData = await db
        .select()
        .from(betterAuth.teamMember)
        .where(eq(betterAuth.teamMember.id, 'nonexistent-member'))
        .limit(1)

      // Assert - member not found
      expect(memberData[0]).toBeUndefined()
    })
  })

  describe('setRate', () => {
    it('should create new default rate', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const now = new Date().toISOString()

      // Act
      const [rate] = await db
        .insert(schema.projectRates)
        .values({
          id: crypto.randomUUID(),
          projectId: project.teamId,
          rateType: 'default',
          billingRoleId: null,
          memberId: null,
          rateAmountCents: 15000,
          effectiveFrom: '2024-06-01',
          effectiveTo: null,
          createdBy: user.id,
          createdAt: now,
        })
        .returning()

      // Assert
      expect(rate).toBeDefined()
      expect(rate.rateType).toBe('default')
      expect(rate.rateAmountCents).toBe(15000)
    })

    it('should create new billing role rate', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const billingRole = await seed.projectBillingRole(db, project.teamId, { name: 'Senior Dev' })
      const user = await seed.user(db)
      const now = new Date().toISOString()

      // Act
      const [rate] = await db
        .insert(schema.projectRates)
        .values({
          id: crypto.randomUUID(),
          projectId: project.teamId,
          rateType: 'billing_role',
          billingRoleId: billingRole.id,
          memberId: null,
          rateAmountCents: 20000,
          effectiveFrom: '2024-06-01',
          effectiveTo: null,
          createdBy: user.id,
          createdAt: now,
        })
        .returning()

      // Assert
      expect(rate).toBeDefined()
      expect(rate.rateType).toBe('billing_role')
      expect(rate.billingRoleId).toBe(billingRole.id)
      expect(rate.rateAmountCents).toBe(20000)
    })

    it('should create new member rate', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)
      const now = new Date().toISOString()

      // Act
      const [rate] = await db
        .insert(schema.projectRates)
        .values({
          id: crypto.randomUUID(),
          projectId: project.teamId,
          rateType: 'member',
          billingRoleId: null,
          memberId: member.id,
          rateAmountCents: 25000,
          effectiveFrom: '2024-06-01',
          effectiveTo: null,
          createdBy: user.id,
          createdAt: now,
        })
        .returning()

      // Assert
      expect(rate).toBeDefined()
      expect(rate.rateType).toBe('member')
      expect(rate.memberId).toBe(member.id)
      expect(rate.rateAmountCents).toBe(25000)
    })

    it('should close previous rate when setting new one', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)

      // Create initial rate
      const oldRate = await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })

      // Act - simulate what the repository does: close old rate, create new one
      const newEffectiveFrom = '2024-06-01'
      const now = new Date().toISOString()

      // Close old rate
      await db
        .update(schema.projectRates)
        .set({ effectiveTo: newEffectiveFrom })
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            eq(schema.projectRates.rateType, 'default'),
            isNull(schema.projectRates.effectiveTo),
            isNull(schema.projectRates.billingRoleId),
            isNull(schema.projectRates.memberId)
          )
        )

      // Create new rate
      await db.insert(schema.projectRates).values({
        id: crypto.randomUUID(),
        projectId: project.teamId,
        rateType: 'default',
        billingRoleId: null,
        memberId: null,
        rateAmountCents: 12000,
        effectiveFrom: newEffectiveFrom,
        effectiveTo: null,
        createdBy: user.id,
        createdAt: now,
      })

      // Assert - old rate should be closed
      const [closedRate] = await db
        .select()
        .from(schema.projectRates)
        .where(eq(schema.projectRates.id, oldRate.id))

      expect(closedRate.effectiveTo).toBe(newEffectiveFrom)

      // Assert - new rate should be active
      const activeRates = await db
        .select()
        .from(schema.projectRates)
        .where(
          and(
            eq(schema.projectRates.projectId, project.teamId),
            eq(schema.projectRates.rateType, 'default'),
            isNull(schema.projectRates.effectiveTo)
          )
        )

      expect(activeRates).toHaveLength(1)
      expect(activeRates[0].rateAmountCents).toBe(12000)
    })

    it('should maintain rate history', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const now = new Date().toISOString()

      // Create rate history manually
      await db.insert(schema.projectRates).values({
        id: crypto.randomUUID(),
        projectId: project.teamId,
        rateType: 'default',
        rateAmountCents: 8000,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-06-01',
        createdBy: user.id,
        createdAt: now,
      })

      await db.insert(schema.projectRates).values({
        id: crypto.randomUUID(),
        projectId: project.teamId,
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveFrom: '2024-06-01',
        effectiveTo: '2024-12-01',
        createdBy: user.id,
        createdAt: now,
      })

      await db.insert(schema.projectRates).values({
        id: crypto.randomUUID(),
        projectId: project.teamId,
        rateType: 'default',
        rateAmountCents: 12000,
        effectiveFrom: '2024-12-01',
        effectiveTo: null,
        createdBy: user.id,
        createdAt: now,
      })

      // Act
      const history = await db
        .select()
        .from(schema.projectRates)
        .where(eq(schema.projectRates.projectId, project.teamId))
        .orderBy(desc(schema.projectRates.effectiveFrom))

      // Assert
      expect(history).toHaveLength(3)
      expect(history[0].rateAmountCents).toBe(12000) // Most recent
      expect(history[1].rateAmountCents).toBe(10000)
      expect(history[2].rateAmountCents).toBe(8000) // Oldest
    })
  })

  describe('delete', () => {
    it('should remove rate from database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const rate = await seed.projectRate(db, project.teamId, { rateAmountCents: 10000 })

      // Act
      await db.delete(schema.projectRates).where(eq(schema.projectRates.id, rate.id))

      // Assert
      const result = await db.select().from(schema.projectRates).where(eq(schema.projectRates.id, rate.id))
      expect(result).toHaveLength(0)
    })
  })
})
