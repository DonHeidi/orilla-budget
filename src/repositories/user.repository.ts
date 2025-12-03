/**
 * User Repository
 *
 * Single entry point for all user domain operations.
 * Encapsulates both direct DB queries and Better Auth API calls.
 */

import { db, betterAuth, pii } from '@/db'
import { eq, and } from 'drizzle-orm'
import { authRepository } from './auth.repository'
import { generateId } from '@/lib/auth'
import type { SystemRole, Pii } from '@/schemas'

// =============================================================================
// TYPES
// =============================================================================

export type User = typeof betterAuth.user.$inferSelect
export type CreateUser = typeof betterAuth.user.$inferInsert

export interface UserWithPii extends User {
  pii?: Pii | null
}

export interface CreateUserData {
  email: string
  password: string
  name: string
  handle?: string
  role?: SystemRole
}

// =============================================================================
// USER REPOSITORY
// =============================================================================

export const userRepository = {
  // ---------------------------------------------------------------------------
  // READ OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    return await db.select().from(betterAuth.user)
  },

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(betterAuth.user)
      .where(eq(betterAuth.user.id, id))
      .limit(1)
    return result[0]
  },

  /**
   * Find user by ID with PII data
   */
  async findByIdWithPii(id: string): Promise<UserWithPii | undefined> {
    const result = await db
      .select({
        user: betterAuth.user,
        pii: pii,
      })
      .from(betterAuth.user)
      .leftJoin(pii, eq(betterAuth.user.piiId, pii.id))
      .where(eq(betterAuth.user.id, id))
      .limit(1)

    if (!result[0]) return undefined

    return {
      ...result[0].user,
      pii: result[0].pii,
    }
  },

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(betterAuth.user)
      .where(eq(betterAuth.user.email, email))
      .limit(1)
    return result[0]
  },

  /**
   * Find user by handle
   */
  async findByHandle(handle: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(betterAuth.user)
      .where(eq(betterAuth.user.handle, handle))
      .limit(1)
    return result[0]
  },

  /**
   * Find active user by email
   */
  async findActiveByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(betterAuth.user)
      .where(and(eq(betterAuth.user.email, email), eq(betterAuth.user.isActive, true)))
      .limit(1)
    return result[0]
  },

  // ---------------------------------------------------------------------------
  // CREATE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Create a user via registration (triggers email verification if enabled)
   */
  async signUp(data: { email: string; password: string; name: string }) {
    const result = await authRepository.signUpEmail(data)
    return result
  },

  /**
   * Create a user (admin action - bypasses email verification)
   */
  async create(data: CreateUserData) {
    const result = await authRepository.createUser({
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
    })

    // Set handle if provided
    if (result?.user && data.handle) {
      await this.updateHandle(result.user.id, data.handle)
    }

    return result
  },

  // ---------------------------------------------------------------------------
  // UPDATE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Update user fields (via Better Auth)
   */
  async update(userId: string, data: Record<string, unknown>) {
    return await authRepository.updateUser(userId, data)
  },

  /**
   * Update user's handle (app-specific field)
   */
  async updateHandle(id: string, handle: string): Promise<void> {
    await db
      .update(betterAuth.user)
      .set({ handle, updatedAt: new Date() })
      .where(eq(betterAuth.user.id, id))
  },

  /**
   * Update user's PII reference
   */
  async updatePiiId(id: string, piiId: string | null): Promise<void> {
    await db
      .update(betterAuth.user)
      .set({ piiId, updatedAt: new Date() })
      .where(eq(betterAuth.user.id, id))
  },

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(betterAuth.user)
      .set({ lastLoginAt: new Date().toISOString(), updatedAt: new Date() })
      .where(eq(betterAuth.user.id, id))
  },

  /**
   * Set user password (admin action)
   */
  async setPassword(userId: string, newPassword: string) {
    return await authRepository.setUserPassword(userId, newPassword)
  },

  /**
   * Set user role
   */
  async setRole(userId: string, role: string) {
    return await authRepository.setRole(userId, role)
  },

  // ---------------------------------------------------------------------------
  // BAN/UNBAN OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Ban a user
   */
  async ban(userId: string, banReason?: string, banExpiresIn?: number) {
    return await authRepository.banUser(userId, banReason, banExpiresIn)
  },

  /**
   * Unban a user
   */
  async unban(userId: string) {
    return await authRepository.unbanUser(userId)
  },

  // ---------------------------------------------------------------------------
  // DELETE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Remove a user (hard delete)
   */
  async remove(userId: string) {
    return await authRepository.removeUser(userId)
  },

  // ---------------------------------------------------------------------------
  // PII OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Create a PII record for a user
   */
  async createPiiRecord(name: string): Promise<string> {
    const timestamp = new Date().toISOString()
    const piiId = generateId()
    await db.insert(pii).values({
      id: piiId,
      name,
      phone: null,
      address: null,
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return piiId
  },
}
