import { db, pii } from '@/db'
import { eq } from 'drizzle-orm'
import type { Pii, CreatePii } from '@/schemas'
import { generateId, now } from '@/lib/auth'

export const piiRepository = {
  /**
   * Create a new PII record
   */
  async create(data: CreatePii): Promise<Pii> {
    const timestamp = now()
    const record: Pii = {
      id: generateId(),
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.insert(pii).values(record)
    return record
  },

  /**
   * Find a PII record by ID
   */
  async findById(id: string): Promise<Pii | undefined> {
    const result = await db.select().from(pii).where(eq(pii.id, id)).limit(1)
    return result[0]
  },

  /**
   * Update a PII record
   */
  async update(id: string, data: Partial<CreatePii>): Promise<void> {
    await db
      .update(pii)
      .set({
        ...data,
        updatedAt: now(),
      })
      .where(eq(pii.id, id))
  },

  /**
   * Delete a PII record (GDPR right-to-erasure)
   * This is a hard delete - the record is permanently removed
   */
  async delete(id: string): Promise<void> {
    await db.delete(pii).where(eq(pii.id, id))
  },

  /**
   * Anonymize a PII record instead of deleting
   * Useful when you need to keep referential integrity but remove personal data
   */
  async anonymize(id: string): Promise<void> {
    await db
      .update(pii)
      .set({
        name: '[deleted]',
        phone: null,
        address: null,
        notes: null,
        updatedAt: now(),
      })
      .where(eq(pii.id, id))
  },
}
