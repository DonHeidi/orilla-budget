import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import type { User } from '@/schemas'

export const userRepository = {
  async findAll(): Promise<User[]> {
    return await db.select().from(users)
  },

  async findById(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return result[0]
  },

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return result[0]
  },

  async create(user: User): Promise<User> {
    await db.insert(users).values(user)
    return user
  },

  async update(id: string, data: Partial<User>): Promise<void> {
    await db.update(users).set(data).where(eq(users.id, id))
  },

  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id))
  },
}
