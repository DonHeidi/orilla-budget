import { db, betterAuth } from '@/db'
import { projectMemberBillingRoles, projectBillingRoles, projectRates } from '@/db/schema'
import { eq, and, isNull, or, sql } from 'drizzle-orm'
import type { MemberBillingDetails, EffectiveRate } from '@/schemas'

export type ProjectMemberBillingRole = typeof projectMemberBillingRoles.$inferSelect
export type { MemberBillingDetails }

export const projectMemberBillingRoleRepository = {
  /**
   * Find billing role assignment for a team member
   */
  async findByTeamMemberId(
    teamMemberId: string
  ): Promise<ProjectMemberBillingRole | undefined> {
    const result = await db
      .select()
      .from(projectMemberBillingRoles)
      .where(eq(projectMemberBillingRoles.teamMemberId, teamMemberId))
      .limit(1)
    return result[0]
  },

  /**
   * Get all members with their billing details for a project
   * Includes billing role assignment and effective rate calculation
   */
  async findByProjectIdWithDetails(
    projectId: string,
    asOfDate?: string
  ): Promise<MemberBillingDetails[]> {
    const date = asOfDate || new Date().toISOString().split('T')[0]

    // Get all team members for this project with their billing role assignments
    const members = await db
      .select({
        userId: betterAuth.teamMember.userId,
        teamMemberId: betterAuth.teamMember.id,
        userName: betterAuth.user.name,
        userEmail: betterAuth.user.email,
        billingRoleId: projectMemberBillingRoles.billingRoleId,
        billingRoleName: projectBillingRoles.name,
      })
      .from(betterAuth.teamMember)
      .innerJoin(betterAuth.user, eq(betterAuth.teamMember.userId, betterAuth.user.id))
      .leftJoin(
        projectMemberBillingRoles,
        eq(betterAuth.teamMember.id, projectMemberBillingRoles.teamMemberId)
      )
      .leftJoin(
        projectBillingRoles,
        eq(projectMemberBillingRoles.billingRoleId, projectBillingRoles.id)
      )
      .where(eq(betterAuth.teamMember.teamId, projectId))

    // Get all active rates for this project
    const rates = await db
      .select()
      .from(projectRates)
      .where(
        and(
          eq(projectRates.projectId, projectId),
          sql`${projectRates.effectiveFrom} <= ${date}`,
          or(isNull(projectRates.effectiveTo), sql`${projectRates.effectiveTo} > ${date}`)
        )
      )

    // Calculate effective rate for each member
    return members.map((member) => {
      let effectiveRate: EffectiveRate | null = null

      // 1. Check for member-specific rate
      const memberRate = rates.find(
        (r) => r.rateType === 'member' && r.memberId === member.teamMemberId
      )
      if (memberRate) {
        effectiveRate = {
          rateAmountCents: memberRate.rateAmountCents,
          source: 'member',
          sourceId: member.teamMemberId,
          sourceName: 'Individual Rate',
        }
      }

      // 2. Check for billing role rate
      if (!effectiveRate && member.billingRoleId) {
        const roleRate = rates.find(
          (r) => r.rateType === 'billing_role' && r.billingRoleId === member.billingRoleId
        )
        if (roleRate) {
          effectiveRate = {
            rateAmountCents: roleRate.rateAmountCents,
            source: 'billing_role',
            sourceId: member.billingRoleId,
            sourceName: member.billingRoleName,
          }
        }
      }

      // 3. Fall back to project default
      if (!effectiveRate) {
        const defaultRate = rates.find((r) => r.rateType === 'default')
        if (defaultRate) {
          effectiveRate = {
            rateAmountCents: defaultRate.rateAmountCents,
            source: 'default',
            sourceId: null,
            sourceName: 'Project Default',
          }
        }
      }

      return {
        userId: member.userId,
        teamMemberId: member.teamMemberId,
        userName: member.userName,
        userEmail: member.userEmail,
        billingRoleId: member.billingRoleId,
        billingRoleName: member.billingRoleName,
        effectiveRate,
      }
    })
  },

  /**
   * Assign or update a billing role for a team member
   * Uses upsert pattern - creates if not exists, updates if exists
   */
  async setMemberBillingRole(
    teamMemberId: string,
    billingRoleId: string | null
  ): Promise<ProjectMemberBillingRole> {
    const now = new Date().toISOString()
    const existing = await this.findByTeamMemberId(teamMemberId)

    if (existing) {
      const result = await db
        .update(projectMemberBillingRoles)
        .set({
          billingRoleId,
          updatedAt: now,
        })
        .where(eq(projectMemberBillingRoles.teamMemberId, teamMemberId))
        .returning()
      return result[0]!
    } else {
      const result = await db
        .insert(projectMemberBillingRoles)
        .values({
          id: crypto.randomUUID(),
          teamMemberId,
          billingRoleId,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      return result[0]!
    }
  },

  /**
   * Remove billing role assignment (different from setting to null)
   */
  async remove(teamMemberId: string): Promise<void> {
    await db
      .delete(projectMemberBillingRoles)
      .where(eq(projectMemberBillingRoles.teamMemberId, teamMemberId))
  },
}
