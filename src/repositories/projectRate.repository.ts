import { db, betterAuth } from '@/db'
import { projectRates, projectBillingRoles, projectMemberBillingRoles, project } from '@/db/schema'
import { eq, and, isNull, lte, or, gt, desc } from 'drizzle-orm'
import type { CreateProjectRate, RateType, EffectiveRate } from '@/schemas'

export type ProjectRate = typeof projectRates.$inferSelect

export const projectRateRepository = {
  /**
   * Get all active rates for a project (where effectiveTo is null)
   */
  async findActiveByProjectId(projectId: string): Promise<ProjectRate[]> {
    return db
      .select()
      .from(projectRates)
      .where(and(eq(projectRates.projectId, projectId), isNull(projectRates.effectiveTo)))
  },

  /**
   * Get rate history for a project (all rates, ordered by date)
   */
  async findHistoryByProjectId(projectId: string): Promise<ProjectRate[]> {
    return db
      .select()
      .from(projectRates)
      .where(eq(projectRates.projectId, projectId))
      .orderBy(desc(projectRates.effectiveFrom))
  },

  /**
   * Get the current default rate for a project
   */
  async getDefaultRate(projectId: string): Promise<ProjectRate | undefined> {
    const result = await db
      .select()
      .from(projectRates)
      .where(
        and(
          eq(projectRates.projectId, projectId),
          eq(projectRates.rateType, 'default'),
          isNull(projectRates.effectiveTo)
        )
      )
      .limit(1)
    return result[0]
  },

  /**
   * Get the current rate for a billing role
   */
  async getBillingRoleRate(
    projectId: string,
    billingRoleId: string
  ): Promise<ProjectRate | undefined> {
    const result = await db
      .select()
      .from(projectRates)
      .where(
        and(
          eq(projectRates.projectId, projectId),
          eq(projectRates.rateType, 'billing_role'),
          eq(projectRates.billingRoleId, billingRoleId),
          isNull(projectRates.effectiveTo)
        )
      )
      .limit(1)
    return result[0]
  },

  /**
   * Get the current rate for a specific member
   */
  async getMemberRate(projectId: string, memberId: string): Promise<ProjectRate | undefined> {
    const result = await db
      .select()
      .from(projectRates)
      .where(
        and(
          eq(projectRates.projectId, projectId),
          eq(projectRates.rateType, 'member'),
          eq(projectRates.memberId, memberId),
          isNull(projectRates.effectiveTo)
        )
      )
      .limit(1)
    return result[0]
  },

  /**
   * Get the effective rate for a team member on a specific date
   * Hierarchy: member-specific > billing role > project default
   */
  async getEffectiveRateForMember(
    memberId: string,
    date: string
  ): Promise<EffectiveRate | null> {
    // Get member's team (project) and billing role assignment
    const memberData = await db
      .select({
        teamId: betterAuth.teamMember.teamId,
        billingRoleId: projectMemberBillingRoles.billingRoleId,
        billingRoleName: projectBillingRoles.name,
      })
      .from(betterAuth.teamMember)
      .leftJoin(
        projectMemberBillingRoles,
        eq(betterAuth.teamMember.id, projectMemberBillingRoles.teamMemberId)
      )
      .leftJoin(
        projectBillingRoles,
        eq(projectMemberBillingRoles.billingRoleId, projectBillingRoles.id)
      )
      .where(eq(betterAuth.teamMember.id, memberId))
      .limit(1)

    if (!memberData[0]) return null

    const { teamId, billingRoleId, billingRoleName } = memberData[0]

    // Get all applicable rates for the project that are effective on the given date
    const rates = await db
      .select()
      .from(projectRates)
      .where(
        and(
          eq(projectRates.projectId, teamId),
          lte(projectRates.effectiveFrom, date),
          or(isNull(projectRates.effectiveTo), gt(projectRates.effectiveTo, date))
        )
      )

    // 1. Check for member-specific rate (highest priority)
    const memberRate = rates.find((r) => r.rateType === 'member' && r.memberId === memberId)
    if (memberRate) {
      return {
        rateAmountCents: memberRate.rateAmountCents,
        source: 'member',
        sourceId: memberId,
        sourceName: 'Individual Rate',
      }
    }

    // 2. Check for billing role rate
    if (billingRoleId) {
      const roleRate = rates.find(
        (r) => r.rateType === 'billing_role' && r.billingRoleId === billingRoleId
      )
      if (roleRate) {
        return {
          rateAmountCents: roleRate.rateAmountCents,
          source: 'billing_role',
          sourceId: billingRoleId,
          sourceName: billingRoleName,
        }
      }
    }

    // 3. Fall back to project default rate
    const defaultRate = rates.find((r) => r.rateType === 'default')
    if (defaultRate) {
      return {
        rateAmountCents: defaultRate.rateAmountCents,
        source: 'default',
        sourceId: null,
        sourceName: 'Project Default',
      }
    }

    return null
  },

  /**
   * Set or update a rate (closes previous rate, creates new one)
   * This maintains rate history by setting effectiveTo on the old rate
   */
  async setRate(data: CreateProjectRate & { createdBy: string }): Promise<ProjectRate> {
    const now = new Date().toISOString()

    // Build conditions to find the existing active rate to close
    const conditions = [
      eq(projectRates.projectId, data.projectId),
      eq(projectRates.rateType, data.rateType),
      isNull(projectRates.effectiveTo),
    ]

    if (data.rateType === 'billing_role' && data.billingRoleId) {
      conditions.push(eq(projectRates.billingRoleId, data.billingRoleId))
    } else if (data.rateType === 'member' && data.memberId) {
      conditions.push(eq(projectRates.memberId, data.memberId))
    } else if (data.rateType === 'default') {
      conditions.push(isNull(projectRates.billingRoleId))
      conditions.push(isNull(projectRates.memberId))
    }

    // Close any existing active rate of the same type/target
    await db
      .update(projectRates)
      .set({ effectiveTo: data.effectiveFrom })
      .where(and(...conditions))

    // Create new rate
    const result = await db
      .insert(projectRates)
      .values({
        id: crypto.randomUUID(),
        projectId: data.projectId,
        rateType: data.rateType,
        billingRoleId: data.billingRoleId || null,
        memberId: data.memberId || null,
        rateAmountCents: data.rateAmountCents,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: null,
        createdBy: data.createdBy,
        createdAt: now,
      })
      .returning()

    return result[0]
  },

  /**
   * Delete a rate (remove from history entirely - use sparingly)
   */
  async delete(id: string): Promise<void> {
    await db.delete(projectRates).where(eq(projectRates.id, id))
  },
}
