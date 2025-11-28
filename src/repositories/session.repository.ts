import { db, sessions, users, pii } from '@/db'
import { eq, and, gt } from 'drizzle-orm'
import type { Session, User, Pii } from '@/schemas'
import { generateId, generateSessionToken, getSessionExpiry, now } from '@/lib/auth'

export interface SessionWithUser {
  session: Session
  user: User
}

export interface SessionWithUserAndPii {
  session: Session
  user: User
  pii: Pii | null
}

export const sessionRepository = {
  /**
   * Create a new session for a user
   */
  async create(userId: string): Promise<Session> {
    const session: Session = {
      id: generateId(),
      userId,
      token: generateSessionToken(),
      expiresAt: getSessionExpiry(),
      createdAt: now(),
    }
    await db.insert(sessions).values(session)
    return session
  },

  /**
   * Find a session by its token
   */
  async findByToken(token: string): Promise<Session | undefined> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1)
    return result[0]
  },

  /**
   * Find a valid (non-expired) session by token
   */
  async findValidByToken(token: string): Promise<Session | undefined> {
    const result = await db
      .select()
      .from(sessions)
      .where(
        and(eq(sessions.token, token), gt(sessions.expiresAt, now()))
      )
      .limit(1)
    return result[0]
  },

  /**
   * Find a valid session with its associated user
   */
  async findValidWithUser(token: string): Promise<SessionWithUser | undefined> {
    const result = await db
      .select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(eq(sessions.token, token), gt(sessions.expiresAt, now()))
      )
      .limit(1)

    if (!result[0]) return undefined

    return {
      session: result[0].session,
      user: result[0].user,
    }
  },

  /**
   * Find all sessions for a user
   */
  async findByUserId(userId: string): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
  },

  /**
   * Delete a session by its token
   */
  async deleteByToken(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token))
  },

  /**
   * Delete all sessions for a user
   */
  async deleteByUserId(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId))
  },

  /**
   * Delete all expired sessions (cleanup)
   */
  async deleteExpired(): Promise<void> {
    await db.delete(sessions).where(gt(now(), sessions.expiresAt))
  },

  /**
   * Extend a session's expiry time
   */
  async extend(token: string, days?: number): Promise<void> {
    await db
      .update(sessions)
      .set({ expiresAt: getSessionExpiry(days) })
      .where(eq(sessions.token, token))
  },

  /**
   * Find a valid session with user and PII data
   * Used for auth context to get display name
   */
  async findValidWithUserAndPii(
    token: string
  ): Promise<SessionWithUserAndPii | undefined> {
    const result = await db
      .select({
        session: sessions,
        user: users,
        pii: pii,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .leftJoin(pii, eq(users.piiId, pii.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now())))
      .limit(1)

    if (!result[0]) return undefined

    return {
      session: result[0].session,
      user: result[0].user,
      pii: result[0].pii,
    }
  },
}
