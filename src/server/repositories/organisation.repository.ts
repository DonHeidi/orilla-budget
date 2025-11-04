import { db, organisations, projects } from '@/db'
import { eq, sum, sql } from 'drizzle-orm'
import type { Organisation } from '@/schemas'

export const organisationRepository = {
  async findAll(): Promise<Organisation[]> {
    return await db.select().from(organisations)
  },

  async findById(id: string): Promise<Organisation | undefined> {
    const result = await db.select().from(organisations).where(eq(organisations.id, id)).limit(1)
    return result[0]
  },

  async create(organisation: Organisation): Promise<Organisation> {
    await db.insert(organisations).values(organisation)
    return organisation
  },

  async update(id: string, data: Partial<Organisation>): Promise<void> {
    await db.update(organisations).set(data).where(eq(organisations.id, id))
  },

  async delete(id: string): Promise<void> {
    await db.delete(organisations).where(eq(organisations.id, id))
  },

  async calculateBudgetHours(organisationId: string): Promise<number> {
    // Only sum budget hours from Time & Materials (budget) projects, not fixed price projects
    const result = await db
      .select({ total: sum(projects.budgetHours) })
      .from(projects)
      .where(
        sql`${projects.organisationId} = ${organisationId} AND ${projects.category} = 'budget'`
      )

    return result[0]?.total ? Number(result[0].total) : 0
  },
}
