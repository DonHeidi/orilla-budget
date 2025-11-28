/**
 * Create a test user for development
 * Usage: bun run scripts/create-test-user.ts
 */

import { db } from '../src/db'
import { users } from '../src/db/schema'
import { hashPassword, generateId } from '../src/lib/auth'

const TEST_EMAIL = 'admin@example.com'
const TEST_PASSWORD = 'password123'
const TEST_HANDLE = 'admin'

async function createTestUser() {
  const now = new Date().toISOString()

  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, TEST_EMAIL),
  })

  if (existing) {
    console.log(`User ${TEST_EMAIL} already exists`)
    return
  }

  const passwordHash = await hashPassword(TEST_PASSWORD)

  await db.insert(users).values({
    id: generateId(),
    handle: TEST_HANDLE,
    email: TEST_EMAIL,
    passwordHash,
    role: 'admin',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })

  console.log(`Created test user:`)
  console.log(`  Email: ${TEST_EMAIL}`)
  console.log(`  Password: ${TEST_PASSWORD}`)
}

createTestUser().catch(console.error)
