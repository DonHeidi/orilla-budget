import { db, betterAuth, entryMessages } from '@/db'
import { eq, and, isNull, desc } from 'drizzle-orm'
import type { EntryMessage, CreateEntryMessage, EntryStatus } from '@/schemas'
import { generateId } from '@/lib/auth'
import { timeEntryRepository } from './timeEntry.repository'

export interface EntryMessageWithAuthor extends EntryMessage {
  authorHandle: string
  authorEmail: string
}

export const entryMessageRepository = {
  /**
   * Create a new message on a time entry
   * Optionally changes the entry status if statusChange is provided
   */
  async create(
    data: CreateEntryMessage,
    authorId: string
  ): Promise<EntryMessage> {
    const now = new Date().toISOString()
    const message: EntryMessage = {
      id: generateId(),
      timeEntryId: data.timeEntryId,
      authorId,
      content: data.content,
      parentMessageId: data.parentMessageId ?? null,
      statusChange: data.statusChange ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.insert(entryMessages).values(message)

    // If this message includes a status change, update the entry's status
    if (data.statusChange) {
      await timeEntryRepository.updateStatus(
        data.timeEntryId,
        data.statusChange as EntryStatus,
        authorId
      )
    }

    return message
  },

  /**
   * Find all messages for a time entry (excluding soft-deleted)
   * Includes author information
   */
  async findByEntryId(timeEntryId: string): Promise<EntryMessageWithAuthor[]> {
    const result = await db
      .select({
        id: entryMessages.id,
        timeEntryId: entryMessages.timeEntryId,
        authorId: entryMessages.authorId,
        content: entryMessages.content,
        parentMessageId: entryMessages.parentMessageId,
        statusChange: entryMessages.statusChange,
        createdAt: entryMessages.createdAt,
        updatedAt: entryMessages.updatedAt,
        deletedAt: entryMessages.deletedAt,
        authorHandle: betterAuth.user.handle,
        authorEmail: betterAuth.user.email,
      })
      .from(entryMessages)
      .innerJoin(betterAuth.user, eq(entryMessages.authorId, betterAuth.user.id))
      .where(
        and(
          eq(entryMessages.timeEntryId, timeEntryId),
          isNull(entryMessages.deletedAt)
        )
      )
      .orderBy(entryMessages.createdAt)

    return result as EntryMessageWithAuthor[]
  },

  /**
   * Find a single message by ID
   */
  async findById(id: string): Promise<EntryMessage | undefined> {
    const result = await db
      .select()
      .from(entryMessages)
      .where(eq(entryMessages.id, id))
      .limit(1)
    return result[0]
  },

  /**
   * Soft delete a message (sets deletedAt timestamp)
   */
  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString()
    await db
      .update(entryMessages)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entryMessages.id, id))
  },

  /**
   * Update message content
   */
  async update(id: string, content: string): Promise<void> {
    const now = new Date().toISOString()
    await db
      .update(entryMessages)
      .set({ content, updatedAt: now })
      .where(eq(entryMessages.id, id))
  },

  /**
   * Get message count for an entry
   */
  async countByEntryId(timeEntryId: string): Promise<number> {
    const result = await db
      .select({ id: entryMessages.id })
      .from(entryMessages)
      .where(
        and(
          eq(entryMessages.timeEntryId, timeEntryId),
          isNull(entryMessages.deletedAt)
        )
      )
    return result.length
  },

  /**
   * Get the most recent message for an entry
   */
  async findLatestByEntryId(
    timeEntryId: string
  ): Promise<EntryMessageWithAuthor | undefined> {
    const result = await db
      .select({
        id: entryMessages.id,
        timeEntryId: entryMessages.timeEntryId,
        authorId: entryMessages.authorId,
        content: entryMessages.content,
        parentMessageId: entryMessages.parentMessageId,
        statusChange: entryMessages.statusChange,
        createdAt: entryMessages.createdAt,
        updatedAt: entryMessages.updatedAt,
        deletedAt: entryMessages.deletedAt,
        authorHandle: betterAuth.user.handle,
        authorEmail: betterAuth.user.email,
      })
      .from(entryMessages)
      .innerJoin(betterAuth.user, eq(entryMessages.authorId, betterAuth.user.id))
      .where(
        and(
          eq(entryMessages.timeEntryId, timeEntryId),
          isNull(entryMessages.deletedAt)
        )
      )
      .orderBy(desc(entryMessages.createdAt))
      .limit(1)

    return result[0] as EntryMessageWithAuthor | undefined
  },
}
