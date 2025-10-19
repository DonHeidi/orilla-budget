import { db, organisations } from '@/db'
import { eq } from 'drizzle-orm'
import type { Organisation } from '@/types'

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
}
