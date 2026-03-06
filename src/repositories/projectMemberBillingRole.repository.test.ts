import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'
import * as schema from '@/db/schema'
import * as betterAuth from '@/db/better-auth-schema'
import { eq, and, isNull, or, sql } from 'drizzle-orm'

/**
 * Project Member Billing Role Repository Tests
 *
 * Key functionality: Assigning billing roles to team members,
 * and calculating effective rates for members
 */

describe('projectMemberBillingRoleRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findByTeamMemberId', () => {
    it('should return assignment for team member', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)
      const billingRole = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })
      await seed.projectMemberBillingRole(db, member.id, { billingRoleId: billingRole.id })

      // Act
      const result = await db
        .select()
        .from(schema.projectMemberBillingRoles)
        .where(eq(schema.projectMemberBillingRoles.teamMemberId, member.id))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].teamMemberId).toBe(member.id)
      expect(result[0].billingRoleId).toBe(billingRole.id)
    })

    it('should return undefined when no assignment', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)

      // Act
      const result = await db
        .select()
        .from(schema.projectMemberBillingRoles)
        .where(eq(schema.projectMemberBillingRoles.teamMemberId, member.id))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByProjectIdWithDetails', () => {
    it('should return all members with billing details', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user1 = await seed.user(db, { name: 'Alice', email: 'alice@example.com' })
      const user2 = await seed.user(db, { name: 'Bob', email: 'bob@example.com' })
      const member1 = await seed.projectMember(db, project.teamId, user1.id)
      const member2 = await seed.projectMember(db, project.teamId, user2.id)

      const devRole = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })
      await seed.projectMemberBillingRole(db, member1.id, { billingRoleId: devRole.id })

      // Act
      const members = await db
        .select({
          userId: betterAuth.teamMember.userId,
          teamMemberId: betterAuth.teamMember.id,
          userName: betterAuth.user.name,
          userEmail: betterAuth.user.email,
          billingRoleId: schema.projectMemberBillingRoles.billingRoleId,
          billingRoleName: schema.projectBillingRoles.name,
        })
        .from(betterAuth.teamMember)
        .innerJoin(betterAuth.user, eq(betterAuth.teamMember.userId, betterAuth.user.id))
        .leftJoin(
          schema.projectMemberBillingRoles,
          eq(betterAuth.teamMember.id, schema.projectMemberBillingRoles.teamMemberId)
        )
        .leftJoin(
          schema.projectBillingRoles,
          eq(schema.projectMemberBillingRoles.billingRoleId, schema.projectBillingRoles.id)
        )
        .where(eq(betterAuth.teamMember.teamId, project.teamId))

      // Assert
      expect(members).toHaveLength(2)

      const alice = members.find((m) => m.userEmail === 'alice@example.com')
      const bob = members.find((m) => m.userEmail === 'bob@example.com')

      expect(alice).toBeDefined()
      expect(alice!.billingRoleName).toBe('Developer')

      expect(bob).toBeDefined()
      expect(bob!.billingRoleId).toBeNull()
      expect(bob!.billingRoleName).toBeNull()
    })

    it('should calculate effective rates correctly', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db, { name: 'Charlie', email: 'charlie@example.com' })
      const member = await seed.projectMember(db, project.teamId, user.id)

      const devRole = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })
      await seed.projectMemberBillingRole(db, member.id, { billingRoleId: devRole.id })

      // Create rates
      await seed.projectRate(db, project.teamId, {
        rateType: 'default',
        rateAmountCents: 10000,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })
      await seed.projectRate(db, project.teamId, {
        rateType: 'billing_role',
        billingRoleId: devRole.id,
        rateAmountCents: 15000,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
      })

      const date = '2024-06-15'

      // Act - get rates for the project
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

      // Assert - billing role rate should be available for calculation
      const roleRate = rates.find((r) => r.rateType === 'billing_role' && r.billingRoleId === devRole.id)
      expect(roleRate).toBeDefined()
      expect(roleRate!.rateAmountCents).toBe(15000)
    })

    it('should include members without billing role', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db, { name: 'Dana', email: 'dana@example.com' })
      await seed.projectMember(db, project.teamId, user.id)
      // No billing role assignment

      // Act
      const members = await db
        .select({
          userId: betterAuth.teamMember.userId,
          teamMemberId: betterAuth.teamMember.id,
          userName: betterAuth.user.name,
          userEmail: betterAuth.user.email,
          billingRoleId: schema.projectMemberBillingRoles.billingRoleId,
          billingRoleName: schema.projectBillingRoles.name,
        })
        .from(betterAuth.teamMember)
        .innerJoin(betterAuth.user, eq(betterAuth.teamMember.userId, betterAuth.user.id))
        .leftJoin(
          schema.projectMemberBillingRoles,
          eq(betterAuth.teamMember.id, schema.projectMemberBillingRoles.teamMemberId)
        )
        .leftJoin(
          schema.projectBillingRoles,
          eq(schema.projectMemberBillingRoles.billingRoleId, schema.projectBillingRoles.id)
        )
        .where(eq(betterAuth.teamMember.teamId, project.teamId))

      // Assert
      expect(members).toHaveLength(1)
      expect(members[0].userEmail).toBe('dana@example.com')
      expect(members[0].billingRoleId).toBeNull()
    })

    it('should return empty array when no members', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Act
      const members = await db
        .select({
          userId: betterAuth.teamMember.userId,
          teamMemberId: betterAuth.teamMember.id,
          userName: betterAuth.user.name,
          userEmail: betterAuth.user.email,
          billingRoleId: schema.projectMemberBillingRoles.billingRoleId,
          billingRoleName: schema.projectBillingRoles.name,
        })
        .from(betterAuth.teamMember)
        .innerJoin(betterAuth.user, eq(betterAuth.teamMember.userId, betterAuth.user.id))
        .leftJoin(
          schema.projectMemberBillingRoles,
          eq(betterAuth.teamMember.id, schema.projectMemberBillingRoles.teamMemberId)
        )
        .leftJoin(
          schema.projectBillingRoles,
          eq(schema.projectMemberBillingRoles.billingRoleId, schema.projectBillingRoles.id)
        )
        .where(eq(betterAuth.teamMember.teamId, project.teamId))

      // Assert
      expect(members).toEqual([])
    })
  })

  describe('setMemberBillingRole', () => {
    it('should create assignment when none exists (insert)', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)
      const billingRole = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })
      const now = new Date().toISOString()

      // Act
      const [assignment] = await db
        .insert(schema.projectMemberBillingRoles)
        .values({
          id: crypto.randomUUID(),
          teamMemberId: member.id,
          billingRoleId: billingRole.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      // Assert
      expect(assignment).toBeDefined()
      expect(assignment.teamMemberId).toBe(member.id)
      expect(assignment.billingRoleId).toBe(billingRole.id)
    })

    it('should update assignment when exists (upsert)', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)
      const devRole = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })
      const seniorRole = await seed.projectBillingRole(db, project.teamId, { name: 'Senior Developer' })

      // Create initial assignment
      await seed.projectMemberBillingRole(db, member.id, { billingRoleId: devRole.id })

      // Act - update to new role
      const now = new Date().toISOString()
      await db
        .update(schema.projectMemberBillingRoles)
        .set({ billingRoleId: seniorRole.id, updatedAt: now })
        .where(eq(schema.projectMemberBillingRoles.teamMemberId, member.id))

      // Assert
      const [updated] = await db
        .select()
        .from(schema.projectMemberBillingRoles)
        .where(eq(schema.projectMemberBillingRoles.teamMemberId, member.id))

      expect(updated.billingRoleId).toBe(seniorRole.id)
    })

    it('should allow setting billingRoleId to null', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)
      const devRole = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })

      // Create initial assignment with a role
      await seed.projectMemberBillingRole(db, member.id, { billingRoleId: devRole.id })

      // Act - set role to null (unassign)
      const now = new Date().toISOString()
      await db
        .update(schema.projectMemberBillingRoles)
        .set({ billingRoleId: null, updatedAt: now })
        .where(eq(schema.projectMemberBillingRoles.teamMemberId, member.id))

      // Assert
      const [updated] = await db
        .select()
        .from(schema.projectMemberBillingRoles)
        .where(eq(schema.projectMemberBillingRoles.teamMemberId, member.id))

      expect(updated.billingRoleId).toBeNull()
    })
  })

  describe('remove', () => {
    it('should delete assignment', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const user = await seed.user(db)
      const member = await seed.projectMember(db, project.teamId, user.id)
      const billingRole = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })
      await seed.projectMemberBillingRole(db, member.id, { billingRoleId: billingRole.id })

      // Verify it exists
      const beforeDelete = await db
        .select()
        .from(schema.projectMemberBillingRoles)
        .where(eq(schema.projectMemberBillingRoles.teamMemberId, member.id))
      expect(beforeDelete).toHaveLength(1)

      // Act
      await db
        .delete(schema.projectMemberBillingRoles)
        .where(eq(schema.projectMemberBillingRoles.teamMemberId, member.id))

      // Assert
      const afterDelete = await db
        .select()
        .from(schema.projectMemberBillingRoles)
        .where(eq(schema.projectMemberBillingRoles.teamMemberId, member.id))

      expect(afterDelete).toHaveLength(0)
    })
  })
})
