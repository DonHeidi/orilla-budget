import { db, accounts } from '@/db'
import { eq } from 'drizzle-orm'
import type { Account } from '@/schemas'

export const accountRepository = {
  async findAll(): Promise<Account[]> {
    return await db.select().from(accounts)
  },

  async findById(id: string): Promise<Account | undefined> {
    const result = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1)
    return result[0]
  },

  async findByOrganisationId(organisationId: string): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.organisationId, organisationId))
  },

  async findByAccessCode(accessCode: string): Promise<Account | undefined> {
    const result = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accessCode, accessCode))
      .limit(1)
    return result[0]
  },

  async create(account: Account): Promise<Account> {
    await db.insert(accounts).values(account)
    return account
  },

  async update(id: string, data: Partial<Account>): Promise<void> {
    await db.update(accounts).set(data).where(eq(accounts.id, id))
  },

  async delete(id: string): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id))
  },
}
