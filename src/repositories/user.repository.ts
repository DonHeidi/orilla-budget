import { db, users, pii } from '@/db'
import { eq, and } from 'drizzle-orm'
import type { User, CreateUser, SystemRole, Pii } from '@/schemas'
import {
  generateId,
  hashPassword,
  verifyPassword,
  now,
} from '@/lib/auth'

export interface UserWithPii extends User {
  pii?: Pii | null
}

export interface CreateUserWithPassword extends Omit<CreateUser, 'passwordHash'> {
  password: string
  name?: string
}

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

  async findByIdWithPii(id: string): Promise<UserWithPii | undefined> {
    const result = await db
      .select({
        user: users,
        pii: pii,
      })
      .from(users)
      .leftJoin(pii, eq(users.piiId, pii.id))
      .where(eq(users.id, id))
      .limit(1)

    if (!result[0]) return undefined

    return {
      ...result[0].user,
      pii: result[0].pii,
    }
  },

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return result[0]
  },

  async findByHandle(handle: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.handle, handle))
      .limit(1)
    return result[0]
  },

  async findActiveByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isActive, true)))
      .limit(1)
    return result[0]
  },

  /**
   * Create a new user with password
   * This handles password hashing and optional PII creation
   */
  async createWithPassword(data: CreateUserWithPassword): Promise<User> {
    const timestamp = now()
    const passwordHash = await hashPassword(data.password)

    // Create PII record if name is provided
    let piiId: string | null = null
    if (data.name) {
      const piiRecord = {
        id: generateId(),
        name: data.name,
        phone: null,
        address: null,
        notes: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      await db.insert(pii).values(piiRecord)
      piiId = piiRecord.id
    }

    const user: User = {
      id: generateId(),
      piiId,
      handle: data.handle,
      email: data.email,
      passwordHash,
      role: data.role ?? null,
      isActive: data.isActive ?? true,
      lastLoginAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await db.insert(users).values(user)
    return user
  },

  /**
   * Legacy create method - for compatibility
   */
  async create(user: User): Promise<User> {
    await db.insert(users).values(user)
    return user
  },

  /**
   * Verify a user's password
   */
  async verifyPassword(
    email: string,
    password: string
  ): Promise<User | null> {
    const user = await this.findActiveByEmail(email)
    if (!user || !user.passwordHash) return null

    const isValid = await verifyPassword(password, user.passwordHash)
    return isValid ? user : null
  },

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: now(), updatedAt: now() })
      .where(eq(users.id, id))
  },

  /**
   * Update user's password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword)
    await db
      .update(users)
      .set({ passwordHash, updatedAt: now() })
      .where(eq(users.id, id))
  },

  /**
   * Update user's system role
   */
  async updateRole(id: string, role: SystemRole | null): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: now() })
      .where(eq(users.id, id))
  },

  /**
   * Deactivate a user account
   */
  async deactivate(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: now() })
      .where(eq(users.id, id))
  },

  /**
   * Activate a user account
   */
  async activate(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: true, updatedAt: now() })
      .where(eq(users.id, id))
  },

  async update(id: string, data: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set({ ...data, updatedAt: now() })
      .where(eq(users.id, id))
  },

  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id))
  },
}
