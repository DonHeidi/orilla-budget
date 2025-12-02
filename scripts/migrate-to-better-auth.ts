/**
 * Migration script: Copy data from existing tables to Better Auth tables
 *
 * This script migrates:
 * - users → user + account (for credentials)
 * - organisations → organization
 * - projects → team
 * - projectMembers → team_member
 *
 * Run with: bun scripts/migrate-to-better-auth.ts
 */

import { db } from '../src/db'
import {
  users,
  organisations,
  projects,
  projectMembers,
} from '../src/db/schema'
import {
  user as baUser,
  account as baAccount,
  organization as baOrganization,
  team as baTeam,
  teamMember as baTeamMember,
  member as baMember,
} from '../src/db/better-auth-schema'
import { eq } from 'drizzle-orm'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateId(): string {
  return crypto.randomUUID()
}

async function migrateUsers() {
  console.log('Migrating users...')

  const existingUsers = await db.select().from(users)
  console.log(`  Found ${existingUsers.length} users to migrate`)

  for (const oldUser of existingUsers) {
    // Check if user already exists in Better Auth
    const existingBaUser = await db
      .select()
      .from(baUser)
      .where(eq(baUser.id, oldUser.id))
      .get()

    if (existingBaUser) {
      console.log(`  Skipping user ${oldUser.email} - already migrated`)
      continue
    }

    // Create Better Auth user (preserve ID for FK references)
    await db.insert(baUser).values({
      id: oldUser.id,
      name: oldUser.handle, // Better Auth uses 'name'
      email: oldUser.email,
      emailVerified: true, // Existing users are considered verified
      role: oldUser.role, // admin plugin role (super_admin, admin, or null)
      handle: oldUser.handle,
      piiId: oldUser.piiId,
      lastLoginAt: oldUser.lastLoginAt,
      isActive: oldUser.isActive,
      createdAt: new Date(oldUser.createdAt),
      updatedAt: new Date(oldUser.updatedAt),
    })

    // Create account record with password hash (for credential auth)
    if (oldUser.passwordHash) {
      await db.insert(baAccount).values({
        id: generateId(),
        userId: oldUser.id,
        accountId: oldUser.id,
        providerId: 'credential',
        password: oldUser.passwordHash, // Argon2id hash works directly
        createdAt: new Date(oldUser.createdAt),
        updatedAt: new Date(oldUser.updatedAt),
      })
    }

    console.log(`  Migrated user: ${oldUser.email}`)
  }

  console.log('  Users migration complete')
}

async function migrateOrganisations() {
  console.log('Migrating organisations...')

  const existingOrgs = await db.select().from(organisations)
  console.log(`  Found ${existingOrgs.length} organisations to migrate`)

  for (const org of existingOrgs) {
    // Check if organization already exists
    const existingBaOrg = await db
      .select()
      .from(baOrganization)
      .where(eq(baOrganization.id, org.id))
      .get()

    if (existingBaOrg) {
      console.log(`  Skipping organisation ${org.name} - already migrated`)
      continue
    }

    // Generate a unique slug
    let slug = slugify(org.name)
    let slugSuffix = 0
    while (true) {
      const existingSlug = await db
        .select()
        .from(baOrganization)
        .where(eq(baOrganization.slug, slug))
        .get()
      if (!existingSlug) break
      slugSuffix++
      slug = `${slugify(org.name)}-${slugSuffix}`
    }

    await db.insert(baOrganization).values({
      id: org.id,
      name: org.name,
      slug,
      contactName: org.contactName,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      createdAt: new Date(org.createdAt),
    })

    console.log(`  Migrated organisation: ${org.name} (slug: ${slug})`)
  }

  console.log('  Organisations migration complete')
}

async function migrateProjects() {
  console.log('Migrating projects...')

  const existingProjects = await db.select().from(projects)
  console.log(`  Found ${existingProjects.length} projects to migrate`)

  for (const project of existingProjects) {
    // Check if team already exists
    const existingTeam = await db
      .select()
      .from(baTeam)
      .where(eq(baTeam.id, project.id))
      .get()

    if (existingTeam) {
      console.log(`  Skipping project ${project.name} - already migrated`)
      continue
    }

    // Skip projects without an organisation (Better Auth requires organizationId)
    if (!project.organisationId) {
      console.log(`  Skipping project ${project.name} - no organisation`)
      continue
    }

    // Verify the organization exists in Better Auth
    const orgExists = await db
      .select()
      .from(baOrganization)
      .where(eq(baOrganization.id, project.organisationId))
      .get()

    if (!orgExists) {
      console.log(
        `  Skipping project ${project.name} - organisation ${project.organisationId} not found in Better Auth`
      )
      continue
    }

    await db.insert(baTeam).values({
      id: project.id,
      name: project.name,
      organizationId: project.organisationId,
      description: project.description,
      category: project.category,
      budgetHours: project.budgetHours,
      createdAt: new Date(project.createdAt),
    })

    console.log(`  Migrated project: ${project.name}`)
  }

  console.log('  Projects migration complete')
}

async function migrateProjectMembers() {
  console.log('Migrating project members...')

  const existingMembers = await db.select().from(projectMembers)
  console.log(`  Found ${existingMembers.length} project members to migrate`)

  // Track organization memberships we've created
  const orgMemberships = new Set<string>()

  for (const member of existingMembers) {
    // Check if team member already exists
    const existingTeamMember = await db
      .select()
      .from(baTeamMember)
      .where(eq(baTeamMember.id, member.id))
      .get()

    if (existingTeamMember) {
      console.log(
        `  Skipping member ${member.userId} in project ${member.projectId} - already migrated`
      )
      continue
    }

    // Verify user exists in Better Auth
    const userExists = await db
      .select()
      .from(baUser)
      .where(eq(baUser.id, member.userId))
      .get()

    if (!userExists) {
      console.log(
        `  Skipping member ${member.userId} - user not found in Better Auth`
      )
      continue
    }

    // Verify team exists
    const team = await db
      .select()
      .from(baTeam)
      .where(eq(baTeam.id, member.projectId))
      .get()

    if (!team) {
      console.log(
        `  Skipping member ${member.userId} - team ${member.projectId} not found`
      )
      continue
    }

    // Create organization membership if not exists
    const orgMemberKey = `${team.organizationId}:${member.userId}`
    if (!orgMemberships.has(orgMemberKey)) {
      const existingOrgMember = await db
        .select()
        .from(baMember)
        .where(eq(baMember.organizationId, team.organizationId))
        .get()

      if (!existingOrgMember) {
        await db.insert(baMember).values({
          id: generateId(),
          organizationId: team.organizationId,
          userId: member.userId,
          role: 'member', // Default org-level role
          createdAt: new Date(member.createdAt),
        })
        console.log(
          `  Created org membership for user ${member.userId} in org ${team.organizationId}`
        )
      }
      orgMemberships.add(orgMemberKey)
    }

    // Create team membership with project role
    await db.insert(baTeamMember).values({
      id: member.id,
      teamId: member.projectId,
      userId: member.userId,
      projectRole: member.role as
        | 'owner'
        | 'expert'
        | 'reviewer'
        | 'client'
        | 'viewer',
      createdAt: new Date(member.createdAt),
    })

    console.log(
      `  Migrated member: ${member.userId} in project ${member.projectId} as ${member.role}`
    )
  }

  console.log('  Project members migration complete')
}

async function main() {
  console.log('='.repeat(60))
  console.log('Starting Better Auth data migration...')
  console.log('='.repeat(60))
  console.log()

  try {
    await migrateUsers()
    console.log()

    await migrateOrganisations()
    console.log()

    await migrateProjects()
    console.log()

    await migrateProjectMembers()
    console.log()

    console.log('='.repeat(60))
    console.log('Migration complete!')
    console.log('='.repeat(60))
    console.log()
    console.log('Next steps:')
    console.log('1. Update the application to use Better Auth for authentication')
    console.log('2. Test login with existing credentials')
    console.log('3. Verify project/organization memberships')
    console.log(
      '4. After verification, backup and drop old tables (users, sessions, organisations, projects, projectMembers)'
    )
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

main()
