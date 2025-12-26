/**
 * Migration script: Create project records from existing team data
 *
 * This script:
 * - Creates a project record for each team that doesn't have one
 * - Copies business data (description, category, budgetHours) from team
 * - Sets createdBy from the first owner found in teamMember
 *
 * Run with: bun scripts/migrate-team-to-project.ts
 */

import { db } from '../src/db'
import { project } from '../src/db/schema'
import { team, teamMember } from '../src/db/better-auth-schema'
import { eq, and } from 'drizzle-orm'

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

async function migrateTeamsToProjects() {
  console.log('Migrating teams to projects...')

  // Get all teams
  const existingTeams = await db.select().from(team)
  console.log(`  Found ${existingTeams.length} teams to process`)

  let created = 0
  let skipped = 0

  for (const t of existingTeams) {
    // Check if project already exists for this team
    const existingProject = await db
      .select()
      .from(project)
      .where(eq(project.teamId, t.id))
      .get()

    if (existingProject) {
      console.log(`  Skipping team "${t.name}" - project already exists`)
      skipped++
      continue
    }

    // Find an owner to set as createdBy (best effort)
    const owner = await db
      .select()
      .from(teamMember)
      .where(and(eq(teamMember.teamId, t.id), eq(teamMember.projectRole, 'owner')))
      .get()

    const createdBy = owner?.userId ?? null

    // Create the project record
    await db.insert(project).values({
      id: generateId(),
      teamId: t.id,
      createdBy,
      organisationId: t.organizationId,
      name: t.name,
      description: t.description ?? '',
      category: (t.category as 'budget' | 'fixed') ?? 'budget',
      budgetHours: t.budgetHours,
      createdAt: now(),
      updatedAt: now(),
    })

    console.log(
      `  Created project for team "${t.name}"${createdBy ? ` (createdBy: ${createdBy})` : ' (no owner found)'}`
    )
    created++
  }

  console.log()
  console.log(`  Migration complete: ${created} created, ${skipped} skipped`)
}

async function main() {
  console.log('='.repeat(60))
  console.log('Team to Project Data Migration')
  console.log('='.repeat(60))
  console.log()

  try {
    await migrateTeamsToProjects()
    console.log()
    console.log('='.repeat(60))
    console.log('Migration complete!')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

main()
