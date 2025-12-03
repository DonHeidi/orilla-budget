import { db, betterAuth } from '@/db'
import { eq, sum, sql, inArray } from 'drizzle-orm'

// Organisation type derived from Better Auth organization schema
export type Organisation = typeof betterAuth.organization.$inferSelect
export type CreateOrganisation = {
  name: string
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
}

/**
 * Organisation Repository
 *
 * This repository handles READ operations via direct DB queries.
 * For mutations, use authRepository in server functions:
 * - authRepository.createOrganization() - create organization
 * - authRepository.updateOrganization() - update organization
 *
 * This separation ensures server-only code isn't bundled for the client.
 */
export const organisationRepository = {
  // ============================================
  // READ OPERATIONS (direct DB - no side effects)
  // ============================================

  async findAll(): Promise<Organisation[]> {
    return await db.select().from(betterAuth.organization)
  },

  async findById(id: string): Promise<Organisation | undefined> {
    const result = await db
      .select()
      .from(betterAuth.organization)
      .where(eq(betterAuth.organization.id, id))
      .limit(1)
    return result[0]
  },

  async findBySlug(slug: string): Promise<Organisation | undefined> {
    const result = await db
      .select()
      .from(betterAuth.organization)
      .where(eq(betterAuth.organization.slug, slug))
      .limit(1)
    return result[0]
  },

  /**
   * Find organisations by their IDs
   * Used for loading orgs related to user's projects
   */
  async findByIds(ids: string[]): Promise<Organisation[]> {
    if (ids.length === 0) return []
    return db.select().from(betterAuth.organization).where(inArray(betterAuth.organization.id, ids))
  },

  /**
   * Calculate total budget hours from Time & Materials projects
   */
  async calculateBudgetHours(organisationId: string): Promise<number> {
    // Only sum budget hours from Time & Materials (budget) projects, not fixed price projects
    const result = await db
      .select({ total: sum(betterAuth.team.budgetHours) })
      .from(betterAuth.team)
      .where(
        sql`${betterAuth.team.organizationId} = ${organisationId} AND ${betterAuth.team.category} = 'budget'`
      )

    return result[0]?.total ? Number(result[0].total) : 0
  },

  // ============================================
  // HELPER OPERATIONS (direct DB for app-specific fields)
  // ============================================

  /**
   * Update contact fields (app-specific, not managed by Better Auth)
   * Call this after using authRepository.createOrganization() or authRepository.updateOrganization()
   */
  async updateContactFields(
    id: string,
    data: Partial<Pick<Organisation, 'contactName' | 'contactEmail' | 'contactPhone'>>
  ): Promise<void> {
    const fields: Record<string, unknown> = {}
    if ('contactName' in data) fields.contactName = data.contactName
    if ('contactEmail' in data) fields.contactEmail = data.contactEmail
    if ('contactPhone' in data) fields.contactPhone = data.contactPhone

    if (Object.keys(fields).length > 0) {
      await db
        .update(betterAuth.organization)
        .set(fields)
        .where(eq(betterAuth.organization.id, id))
    }
  },
}
