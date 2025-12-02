import { hashPassword } from '../src/lib/auth'
import { db } from '../src/db'
import {
  accounts,
  timeEntries,
  timeSheets,
  timeSheetEntries,
  pii,
  contacts,
  invitations,
  entryMessages,
  projectApprovalSettings,
  timeSheetApprovals,
} from '../src/db/schema'
import {
  user as baUser,
  account as baAccount,
  session as baSession,
  organization as baOrganization,
  team as baTeam,
  teamMember as baTeamMember,
  member as baMember,
} from '../src/db/better-auth-schema'
import { accountRepository } from '../src/repositories/account.repository'
import { timeEntryRepository } from '../src/repositories/timeEntry.repository'
import { timeSheetRepository } from '../src/repositories/timeSheet.repository'
import type {
  Account,
  TimeEntry,
  TimeSheet,
} from '../src/schemas'

// Parse CLI arguments
const args = process.argv.slice(2)
const shouldClear = args.includes('--clear')

/**
 * Generate a slug from a name
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Clear all data from the database
 * Deletes in reverse dependency order to avoid foreign key constraint violations
 */
async function clearDatabase() {
  console.log('🗑️  Clearing existing data...')

  // Delete in reverse dependency order
  await db.delete(entryMessages)
  await db.delete(timeSheetApprovals)
  await db.delete(timeSheetEntries)
  await db.delete(timeSheets)
  await db.delete(timeEntries)
  await db.delete(projectApprovalSettings)
  await db.delete(invitations)
  await db.delete(contacts)
  await db.delete(accounts) // Client portal accounts (not Better Auth accounts)

  // Better Auth tables
  await db.delete(baTeamMember)
  await db.delete(baTeam)
  await db.delete(baMember)
  await db.delete(baOrganization)
  await db.delete(baSession)
  await db.delete(baAccount)
  await db.delete(baUser)
  await db.delete(pii)

  console.log('✓ Database cleared')
}

/**
 * Generate unique access code
 */
function generateAccessCode(orgName: string, index: number): string {
  const prefix = orgName.substring(0, 4).toUpperCase().replace(/\s/g, '')
  return `${prefix}${2024 + index}${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

/**
 * Generate date string in YYYY-MM-DD format
 */
function dateString(daysAgo: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString()
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  try {
    if (shouldClear) {
      await clearDatabase()
    }

    const startTime = Date.now()
    console.log('\n🌱 Starting database seed...\n')

    // ========================================
    // USERS (Better Auth)
    // ========================================
    console.log('👤 Creating users...')

    // Default password for all test users
    const defaultPassword = 'password123'
    const passwordHash = await hashPassword(defaultPassword)
    const timestamp = new Date()

    // User data for Better Auth
    const testUsers = [
      // Super admin - full platform access
      {
        id: 'user-admin',
        name: 'Admin',
        handle: 'admin',
        email: 'admin@orilla.dev',
        role: 'super_admin' as const,
      },
      // Admin - user management but not platform settings
      {
        id: 'user-staff',
        name: 'Staff',
        handle: 'staff',
        email: 'staff@orilla.dev',
        role: 'admin' as const,
      },
      // Regular users - access via project membership only
      {
        id: 'user-1',
        name: 'Alice',
        handle: 'alice',
        email: 'alice@orilla.dev',
        role: null,
      },
      {
        id: 'user-2',
        name: 'Bob PM',
        handle: 'bob_pm',
        email: 'bob@orilla.dev',
        role: null,
      },
      {
        id: 'user-3',
        name: 'Charlie Dev',
        handle: 'charlie_dev',
        email: 'charlie@orilla.dev',
        role: null,
      },
      // Client user - will be added to projects as client/viewer
      {
        id: 'user-client',
        name: 'Jennifer Client',
        handle: 'jennifer_client',
        email: 'jennifer@acmesaas.com',
        role: null,
      },
    ]

    for (const user of testUsers) {
      // Create Better Auth user
      await db.insert(baUser).values({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: true,
        role: user.role,
        handle: user.handle,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      })

      // Create credential account with password hash
      await db.insert(baAccount).values({
        id: `acc-${user.id}`,
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: passwordHash,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }
    console.log(`✓ Created ${testUsers.length} users (password: ${defaultPassword})`)

    // ========================================
    // ORGANISATIONS (Better Auth)
    // ========================================
    console.log('\n🏢 Creating organisations...')

    const testOrganisations = [
      {
        id: 'org-1',
        name: 'Acme SaaS Inc',
        slug: slugify('Acme SaaS Inc'),
        contactName: 'Jennifer Williams',
        contactEmail: 'jennifer@acmesaas.com',
      },
      {
        id: 'org-2',
        name: 'Creative Agency Co',
        slug: slugify('Creative Agency Co'),
        contactName: 'Michael Chen',
        contactEmail: 'michael@creativeagency.co',
      },
    ]

    for (const org of testOrganisations) {
      await db.insert(baOrganization).values({
        id: org.id,
        name: org.name,
        slug: org.slug,
        contactName: org.contactName,
        contactEmail: org.contactEmail,
        createdAt: timestamp,
      })
    }
    console.log(`✓ Created ${testOrganisations.length} organisations`)

    // ========================================
    // ACCOUNTS
    // ========================================
    console.log('\n👥 Creating accounts...')

    const testAccounts: Account[] = [
      // Acme SaaS Inc accounts
      {
        id: 'acc-1',
        userId: 'user-1',
        organisationId: 'org-1',
        name: 'Jennifer Williams',
        email: 'jennifer@acmesaas.com',
        role: 'contact',
        accessCode: generateAccessCode('Acme SaaS Inc', 1),
        createdAt: now(),
      },
      {
        id: 'acc-2',
        userId: 'user-2',
        organisationId: 'org-1',
        name: 'David Anderson',
        email: 'david@acmesaas.com',
        role: 'project_manager',
        accessCode: generateAccessCode('Acme SaaS Inc', 2),
        createdAt: now(),
      },
      {
        id: 'acc-3',
        userId: null,
        organisationId: 'org-1',
        name: 'Sarah Johnson',
        email: 'sarah@acmesaas.com',
        role: 'finance',
        accessCode: generateAccessCode('Acme SaaS Inc', 3),
        createdAt: now(),
      },
      {
        id: 'acc-4',
        userId: null,
        organisationId: 'org-1',
        name: 'Robert Martinez',
        email: 'robert@acmesaas.com',
        role: 'contact',
        accessCode: generateAccessCode('Acme SaaS Inc', 4),
        createdAt: now(),
      },
      // Creative Agency Co accounts
      {
        id: 'acc-5',
        userId: 'user-3',
        organisationId: 'org-2',
        name: 'Michael Chen',
        email: 'michael@creativeagency.co',
        role: 'contact',
        accessCode: generateAccessCode('Creative Agency Co', 1),
        createdAt: now(),
      },
      {
        id: 'acc-6',
        userId: null,
        organisationId: 'org-2',
        name: 'Emily Rodriguez',
        email: 'emily@creativeagency.co',
        role: 'project_manager',
        accessCode: generateAccessCode('Creative Agency Co', 2),
        createdAt: now(),
      },
      {
        id: 'acc-7',
        userId: null,
        organisationId: 'org-2',
        name: 'James Thompson',
        email: 'james@creativeagency.co',
        role: 'finance',
        accessCode: generateAccessCode('Creative Agency Co', 3),
        createdAt: now(),
      },
    ]

    for (const account of testAccounts) {
      await accountRepository.create(account)
    }
    console.log(`✓ Created ${testAccounts.length} accounts`)

    // ========================================
    // PROJECTS (Better Auth Teams)
    // ========================================
    console.log('\n📁 Creating projects...')

    const testProjects = [
      // Acme SaaS Inc projects
      {
        id: 'proj-1',
        organizationId: 'org-1',
        name: 'Website Redesign',
        description: 'Complete redesign of marketing website with modern UI/UX',
        category: 'budget' as const,
        budgetHours: 200,
      },
      {
        id: 'proj-2',
        organizationId: 'org-1',
        name: 'Mobile App Development',
        description: 'Native iOS and Android applications',
        category: 'fixed' as const,
        budgetHours: null,
      },
      {
        id: 'proj-3',
        organizationId: 'org-1',
        name: 'API Integration',
        description: 'Third-party API integrations for CRM and analytics',
        category: 'budget' as const,
        budgetHours: 80,
      },
      // Creative Agency Co projects
      {
        id: 'proj-4',
        organizationId: 'org-2',
        name: 'Brand Identity Package',
        description: 'Logo, color palette, and brand guidelines',
        category: 'fixed' as const,
        budgetHours: null,
      },
      {
        id: 'proj-5',
        organizationId: 'org-2',
        name: 'Social Media Campaign',
        description: 'Q1 social media content creation and management',
        category: 'budget' as const,
        budgetHours: 120,
      },
      {
        id: 'proj-6',
        organizationId: 'org-2',
        name: 'Video Production',
        description: 'Promotional video series for product launch',
        category: 'budget' as const,
        budgetHours: 60,
      },
    ]

    for (const project of testProjects) {
      await db.insert(baTeam).values({
        id: project.id,
        name: project.name,
        organizationId: project.organizationId,
        description: project.description,
        category: project.category,
        budgetHours: project.budgetHours,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }
    console.log(`✓ Created ${testProjects.length} projects`)

    // ========================================
    // PROJECT MEMBERS (Better Auth TeamMembers + Organization Members)
    // ========================================
    console.log('\n👥 Creating project members...')

    const testProjectMembers = [
      // Website Redesign (proj-1) - Acme SaaS
      { id: 'pm-1', teamId: 'proj-1', userId: 'user-1', projectRole: 'owner' as const, orgId: 'org-1' },
      { id: 'pm-2', teamId: 'proj-1', userId: 'user-2', projectRole: 'expert' as const, orgId: 'org-1' },
      { id: 'pm-3', teamId: 'proj-1', userId: 'user-client', projectRole: 'client' as const, orgId: 'org-1' },

      // Mobile App Development (proj-2) - Acme SaaS
      { id: 'pm-4', teamId: 'proj-2', userId: 'user-1', projectRole: 'owner' as const, orgId: 'org-1' },
      { id: 'pm-5', teamId: 'proj-2', userId: 'user-3', projectRole: 'expert' as const, orgId: 'org-1' },
      { id: 'pm-6', teamId: 'proj-2', userId: 'user-client', projectRole: 'reviewer' as const, orgId: 'org-1' },

      // API Integration (proj-3) - Acme SaaS
      { id: 'pm-7', teamId: 'proj-3', userId: 'user-2', projectRole: 'owner' as const, orgId: 'org-1' },
      { id: 'pm-8', teamId: 'proj-3', userId: 'user-3', projectRole: 'expert' as const, orgId: 'org-1' },

      // Brand Identity Package (proj-4) - Creative Agency
      { id: 'pm-9', teamId: 'proj-4', userId: 'user-3', projectRole: 'owner' as const, orgId: 'org-2' },
      { id: 'pm-10', teamId: 'proj-4', userId: 'user-1', projectRole: 'viewer' as const, orgId: 'org-2' },

      // Social Media Campaign (proj-5) - Creative Agency
      { id: 'pm-11', teamId: 'proj-5', userId: 'user-3', projectRole: 'owner' as const, orgId: 'org-2' },
      { id: 'pm-12', teamId: 'proj-5', userId: 'user-2', projectRole: 'expert' as const, orgId: 'org-2' },

      // Video Production (proj-6) - Creative Agency
      { id: 'pm-13', teamId: 'proj-6', userId: 'user-1', projectRole: 'owner' as const, orgId: 'org-2' },
      { id: 'pm-14', teamId: 'proj-6', userId: 'user-client', projectRole: 'viewer' as const, orgId: 'org-2' },
    ]

    // Track organization memberships to avoid duplicates
    const orgMemberships = new Set<string>()

    for (const member of testProjectMembers) {
      // Create team member (project membership)
      await db.insert(baTeamMember).values({
        id: member.id,
        teamId: member.teamId,
        userId: member.userId,
        projectRole: member.projectRole,
        createdAt: timestamp,
      })

      // Create organization membership if not already created
      const orgMemberKey = `${member.orgId}:${member.userId}`
      if (!orgMemberships.has(orgMemberKey)) {
        await db.insert(baMember).values({
          id: `member-${member.orgId}-${member.userId}`,
          organizationId: member.orgId,
          userId: member.userId,
          role: 'member',
          createdAt: timestamp,
        })
        orgMemberships.add(orgMemberKey)
      }
    }
    console.log(`✓ Created ${testProjectMembers.length} project members`)

    // ========================================
    // TIME ENTRIES
    // ========================================
    console.log('\n⏱️  Creating time entries...')

    const testTimeEntries: TimeEntry[] = [
      // Website Redesign (proj-1) entries
      {
        id: 'time-1',
        projectId: 'proj-1',
        organisationId: 'org-1',
        title: 'Initial discovery and requirements gathering',
        description: 'Met with stakeholders to understand needs and goals',
        hours: 6,
        date: dateString(21),
        approvedDate: now(),
        billed: false,
        status: 'approved',
        statusChangedAt: now(),
        statusChangedBy: 'user-client',
        createdBy: 'user-1',
        createdAt: now(),
      },
      {
        id: 'time-2',
        projectId: 'proj-1',
        organisationId: 'org-1',
        title: 'Wireframe design',
        description: 'Created low-fidelity wireframes for all key pages',
        hours: 10,
        date: dateString(18),
        approvedDate: now(),
        billed: false,
        status: 'approved',
        statusChangedAt: now(),
        statusChangedBy: 'user-client',
        createdBy: 'user-2',
        createdAt: now(),
      },
      {
        id: 'time-3',
        projectId: 'proj-1',
        organisationId: 'org-1',
        title: 'High-fidelity mockups',
        description: 'Designed pixel-perfect mockups in Figma',
        hours: 14,
        date: dateString(15),
        approvedDate: undefined,
        billed: false,
        status: 'questioned',
        statusChangedAt: now(),
        statusChangedBy: 'user-client',
        createdBy: 'user-1',
        createdAt: now(),
      },
      {
        id: 'time-4',
        projectId: 'proj-1',
        organisationId: 'org-1',
        title: 'Frontend development - Homepage',
        description: 'Implemented responsive homepage with Tailwind CSS',
        hours: 8,
        date: dateString(12),
        approvedDate: undefined,
        billed: false,
        status: 'pending',
        createdBy: 'user-2',
        createdAt: now(),
      },
      // API Integration (proj-3) entries
      {
        id: 'time-5',
        projectId: 'proj-3',
        organisationId: 'org-1',
        title: 'API research and documentation review',
        description: 'Studied third-party API documentation',
        hours: 4,
        date: dateString(10),
        approvedDate: undefined,
        billed: false,
        status: 'pending',
        createdBy: 'user-3',
        createdAt: now(),
      },
      {
        id: 'time-6',
        projectId: 'proj-3',
        organisationId: 'org-1',
        title: 'Authentication implementation',
        description: 'Implemented OAuth2 flow for API access',
        hours: 6,
        date: dateString(8),
        approvedDate: undefined,
        billed: false,
        status: 'pending',
        createdBy: 'user-3',
        createdAt: now(),
      },
      // Social Media Campaign (proj-5) entries
      {
        id: 'time-7',
        projectId: 'proj-5',
        organisationId: 'org-2',
        title: 'Content strategy planning',
        description: 'Developed content calendar and themes',
        hours: 5,
        date: dateString(14),
        approvedDate: now(),
        billed: false,
        status: 'approved',
        statusChangedAt: now(),
        statusChangedBy: 'user-3',
        createdBy: 'user-2',
        createdAt: now(),
      },
      {
        id: 'time-8',
        projectId: 'proj-5',
        organisationId: 'org-2',
        title: 'Photo shoot coordination',
        description: 'Organized and directed product photography session',
        hours: 8,
        date: dateString(11),
        approvedDate: now(),
        billed: false,
        status: 'approved',
        statusChangedAt: now(),
        statusChangedBy: 'user-3',
        createdBy: 'user-2',
        createdAt: now(),
      },
      {
        id: 'time-9',
        projectId: 'proj-5',
        organisationId: 'org-2',
        title: 'Content creation - Week 1',
        description: 'Created posts for Instagram, Twitter, and LinkedIn',
        hours: 6,
        date: dateString(7),
        approvedDate: undefined,
        billed: false,
        status: 'pending',
        createdBy: 'user-2',
        createdAt: now(),
      },
      // Video Production (proj-6) entries
      {
        id: 'time-10',
        projectId: 'proj-6',
        organisationId: 'org-2',
        title: 'Script writing',
        description: 'Wrote scripts for 3 promotional videos',
        hours: 7,
        date: dateString(9),
        approvedDate: undefined,
        billed: false,
        status: 'pending',
        createdBy: 'user-1',
        createdAt: now(),
      },
      {
        id: 'time-11',
        projectId: 'proj-6',
        organisationId: 'org-2',
        title: 'Video editing - Video 1',
        description: 'Edited first promotional video with motion graphics',
        hours: 10,
        date: dateString(5),
        approvedDate: undefined,
        billed: false,
        status: 'pending',
        createdBy: 'user-1',
        createdAt: now(),
      },
      // Unassigned entries (org-level only)
      {
        id: 'time-12',
        projectId: undefined,
        organisationId: 'org-1',
        title: 'Client consultation call',
        description: 'General project status update with client',
        hours: 2,
        date: dateString(6),
        approvedDate: undefined,
        billed: false,
        status: 'pending',
        createdBy: 'user-1',
        createdAt: now(),
      },
      {
        id: 'time-13',
        projectId: undefined,
        organisationId: 'org-2',
        title: 'Project planning session',
        description: 'Roadmap planning for upcoming initiatives',
        hours: 3,
        date: dateString(4),
        approvedDate: undefined,
        billed: false,
        status: 'pending',
        createdBy: 'user-3',
        createdAt: now(),
      },
    ]

    for (const entry of testTimeEntries) {
      await timeEntryRepository.create(entry)
    }
    console.log(`✓ Created ${testTimeEntries.length} time entries`)

    // ========================================
    // TIME SHEETS
    // ========================================
    console.log('\n📋 Creating time sheets...')

    const testTimeSheets: TimeSheet[] = [
      {
        id: 'sheet-1',
        title: 'Acme SaaS - Week of Jan 15-21',
        description: 'Weekly timesheet for website redesign work',
        startDate: dateString(21),
        endDate: dateString(15),
        status: 'approved',
        submittedDate: dateString(14),
        approvedDate: dateString(13),
        rejectedDate: undefined,
        rejectionReason: undefined,
        organisationId: 'org-1',
        projectId: 'proj-1',
        accountId: 'acc-2', // David Anderson (Project Manager)
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: 'sheet-2',
        title: 'Acme SaaS - Week of Jan 8-14',
        description: 'Recent work on website and API projects',
        startDate: dateString(14),
        endDate: dateString(8),
        status: 'submitted',
        submittedDate: dateString(7),
        approvedDate: undefined,
        rejectedDate: undefined,
        rejectionReason: undefined,
        organisationId: 'org-1',
        projectId: undefined,
        accountId: 'acc-3', // Sarah Johnson (Finance)
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: 'sheet-3',
        title: 'Creative Agency - January Work',
        description: 'Social media campaign and video production',
        startDate: dateString(14),
        endDate: dateString(7),
        status: 'approved',
        submittedDate: dateString(6),
        approvedDate: dateString(5),
        rejectedDate: undefined,
        rejectionReason: undefined,
        organisationId: 'org-2',
        projectId: undefined,
        accountId: 'acc-6', // Emily Rodriguez (Project Manager)
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: 'sheet-4',
        title: 'Creative Agency - Recent Work',
        description: 'Latest video and planning work',
        startDate: dateString(9),
        endDate: dateString(4),
        status: 'draft',
        submittedDate: undefined,
        approvedDate: undefined,
        rejectedDate: undefined,
        rejectionReason: undefined,
        organisationId: 'org-2',
        projectId: 'proj-6',
        accountId: undefined, // No account - testing backwards compatibility
        createdAt: now(),
        updatedAt: now(),
      },
    ]

    for (const sheet of testTimeSheets) {
      await timeSheetRepository.create(sheet)
    }
    console.log(`✓ Created ${testTimeSheets.length} time sheets`)

    // ========================================
    // TIME SHEET ENTRIES (Junction)
    // ========================================
    console.log('\n🔗 Creating time sheet entries...')

    // Add entries to time sheets using the repository method
    await timeSheetRepository.addEntries('sheet-1', ['time-1', 'time-2'])
    await timeSheetRepository.addEntries('sheet-2', ['time-3', 'time-4', 'time-5', 'time-6'])
    await timeSheetRepository.addEntries('sheet-3', ['time-7', 'time-8'])
    await timeSheetRepository.addEntries('sheet-4', ['time-10', 'time-11', 'time-13'])

    const allSheetEntries = await db.select().from(timeSheetEntries)
    console.log(`✓ Created ${allSheetEntries.length} time sheet entries`)

    // ========================================
    // PROJECT APPROVAL SETTINGS
    // ========================================
    console.log('\n⚙️  Creating project approval settings...')

    const testApprovalSettings = [
      // Website Redesign - requires client approval
      {
        id: 'pas-1',
        projectId: 'proj-1',
        approvalMode: 'required' as const,
        autoApproveAfterDays: 0,
        requireAllEntriesApproved: true,
        allowSelfApproveNoClient: false,
        approvalStages: null,
        createdAt: now(),
        updatedAt: now(),
      },
      // Mobile App Development - multi-stage approval
      {
        id: 'pas-2',
        projectId: 'proj-2',
        approvalMode: 'multi_stage' as const,
        autoApproveAfterDays: 0,
        requireAllEntriesApproved: true,
        allowSelfApproveNoClient: false,
        approvalStages: JSON.stringify(['expert', 'reviewer', 'client']),
        createdAt: now(),
        updatedAt: now(),
      },
      // API Integration - self-approve (no client)
      {
        id: 'pas-3',
        projectId: 'proj-3',
        approvalMode: 'self_approve' as const,
        autoApproveAfterDays: 7,
        requireAllEntriesApproved: false,
        allowSelfApproveNoClient: true,
        approvalStages: null,
        createdAt: now(),
        updatedAt: now(),
      },
      // Social Media Campaign - optional approval
      {
        id: 'pas-4',
        projectId: 'proj-5',
        approvalMode: 'optional' as const,
        autoApproveAfterDays: 14,
        requireAllEntriesApproved: false,
        allowSelfApproveNoClient: true,
        approvalStages: null,
        createdAt: now(),
        updatedAt: now(),
      },
    ]

    for (const settings of testApprovalSettings) {
      await db.insert(projectApprovalSettings).values(settings)
    }
    console.log(`✓ Created ${testApprovalSettings.length} project approval settings`)

    // ========================================
    // ENTRY MESSAGES
    // ========================================
    console.log('\n💬 Creating entry messages...')

    const testEntryMessages = [
      // Messages on the questioned entry (time-3)
      {
        id: 'msg-1',
        timeEntryId: 'time-3',
        authorId: 'user-client',
        content: 'Can you clarify what is meant by "high-fidelity mockups"? How many pages were designed?',
        statusChange: 'questioned' as const,
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: 'msg-2',
        timeEntryId: 'time-3',
        authorId: 'user-1',
        content: 'The mockups included the homepage, about page, contact page, and the product listings. All designs are pixel-perfect and ready for development.',
        statusChange: null,
        createdAt: now(),
        updatedAt: now(),
      },
      // Message on an approved entry (time-1)
      {
        id: 'msg-3',
        timeEntryId: 'time-1',
        authorId: 'user-client',
        content: 'Looks good, thanks for the thorough discovery work!',
        statusChange: 'approved' as const,
        createdAt: now(),
        updatedAt: now(),
      },
    ]

    for (const message of testEntryMessages) {
      await db.insert(entryMessages).values(message)
    }
    console.log(`✓ Created ${testEntryMessages.length} entry messages`)

    // ========================================
    // SUMMARY
    // ========================================
    const duration = Date.now() - startTime
    console.log('\n✅ Database seeded successfully!')
    console.log(`⏱️  Completed in ${duration}ms\n`)

    console.log('📊 Summary:')
    console.log(`   Users: ${testUsers.length}`)
    console.log(`     - super_admin: 1 (admin@orilla.dev)`)
    console.log(`     - admin: 1 (staff@orilla.dev)`)
    console.log(`     - regular: ${testUsers.length - 2}`)
    console.log(`   Organisations: ${testOrganisations.length}`)
    console.log(`   Accounts: ${testAccounts.length}`)
    console.log(`   Projects: ${testProjects.length}`)
    console.log(`   Project Members: ${testProjectMembers.length}`)
    console.log(`   Time Entries: ${testTimeEntries.length}`)
    console.log(`   Time Sheets: ${testTimeSheets.length}`)
    console.log(`   Time Sheet Entries: ${allSheetEntries.length}`)
    console.log(`   Project Approval Settings: ${testApprovalSettings.length}`)
    console.log(`   Entry Messages: ${testEntryMessages.length}`)
    console.log('\n💡 Tip: Run `bun run db:studio` to view the data in Drizzle Studio')

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding
seedDatabase()
