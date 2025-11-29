/**
 * Backfill script to assign createdByUserId to existing time entries
 *
 * Strategy: Assign all time entries without a creator to the first super_admin user
 * This ensures existing data remains accessible to admins while new entries
 * will have proper creator tracking.
 *
 * Run with: bun scripts/backfill-time-entry-creators.ts
 */

import { db } from '../src/db'
import { users, timeEntries } from '../src/db/schema'
import { eq, isNull } from 'drizzle-orm'

async function backfillTimeEntryCreators() {
  console.log('🔄 Backfilling time entry creators...')

  // Find the first super_admin user
  const admins = await db
    .select()
    .from(users)
    .where(eq(users.role, 'super_admin'))
    .limit(1)

  if (admins.length === 0) {
    console.log('❌ No super_admin user found. Cannot backfill.')
    console.log('   Create a super_admin user first, then run this script again.')
    process.exit(1)
  }

  const adminUser = admins[0]
  console.log(`📌 Using admin user: ${adminUser.handle} (${adminUser.id})`)

  // Count entries without createdByUserId
  const orphanedEntries = await db
    .select()
    .from(timeEntries)
    .where(isNull(timeEntries.createdByUserId))

  if (orphanedEntries.length === 0) {
    console.log('✅ No time entries need backfilling. All entries have a creator.')
    return
  }

  console.log(`📊 Found ${orphanedEntries.length} time entries without a creator`)

  // Update all entries without a creator
  const result = await db
    .update(timeEntries)
    .set({ createdByUserId: adminUser.id })
    .where(isNull(timeEntries.createdByUserId))

  console.log(`✅ Backfilled ${orphanedEntries.length} time entries`)
  console.log(`   All entries now assigned to: ${adminUser.handle}`)
}

backfillTimeEntryCreators()
  .then(() => {
    console.log('🎉 Backfill complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Backfill failed:', error)
    process.exit(1)
  })
