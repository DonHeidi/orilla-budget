import { db } from '../src/db'
import {
  users,
  organisations,
  accounts,
  projects,
  timeEntries,
  timeSheets,
  timeSheetEntries,
} from '../src/db/schema'
import { userRepository } from '../src/repositories/user.repository'
import { organisationRepository } from '../src/repositories/organisation.repository'
import { accountRepository } from '../src/repositories/account.repository'
import { projectRepository } from '../src/repositories/project.repository'
import { timeEntryRepository } from '../src/repositories/timeEntry.repository'
import { timeSheetRepository } from '../src/repositories/timeSheet.repository'
import type {
  User,
  Organisation,
  Account,
  Project,
  TimeEntry,
  TimeSheet,
} from '../src/schemas'

// Parse CLI arguments
const args = process.argv.slice(2)
const shouldClear = args.includes('--clear')

/**
 * Clear all data from the database
 * Deletes in reverse dependency order to avoid foreign key constraint violations
 */
async function clearDatabase() {
  console.log('🗑️  Clearing existing data...')

  await db.delete(timeSheetEntries)
  await db.delete(timeSheets)
  await db.delete(timeEntries)
  await db.delete(projects)
  await db.delete(accounts)
  await db.delete(organisations)
  await db.delete(users)

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
    // USERS
    // ========================================
    console.log('👤 Creating users...')

    const testUsers: User[] = [
      {
        id: 'user-1',
        handle: 'alice',
        email: 'alice@orilla.dev',
        createdAt: now(),
      },
      {
        id: 'user-2',
        handle: 'bob_pm',
        email: 'bob@orilla.dev',
        createdAt: now(),
      },
      {
        id: 'user-3',
        handle: 'charlie_dev',
        email: 'charlie@orilla.dev',
        createdAt: now(),
      },
    ]

    for (const user of testUsers) {
      await userRepository.create(user)
    }
    console.log(`✓ Created ${testUsers.length} users`)

    // ========================================
    // ORGANISATIONS
    // ========================================
    console.log('\n🏢 Creating organisations...')

    const testOrganisations: Organisation[] = [
      {
        id: 'org-1',
        name: 'Acme SaaS Inc',
        contactName: 'Jennifer Williams',
        contactEmail: 'jennifer@acmesaas.com',
        createdAt: now(),
      },
      {
        id: 'org-2',
        name: 'Creative Agency Co',
        contactName: 'Michael Chen',
        contactEmail: 'michael@creativeagency.co',
        createdAt: now(),
      },
    ]

    for (const org of testOrganisations) {
      await organisationRepository.create(org)
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
    // PROJECTS
    // ========================================
    console.log('\n📁 Creating projects...')

    const testProjects: Project[] = [
      // Acme SaaS Inc projects
      {
        id: 'proj-1',
        organisationId: 'org-1',
        name: 'Website Redesign',
        description: 'Complete redesign of marketing website with modern UI/UX',
        category: 'budget',
        budgetHours: 200,
        createdAt: now(),
      },
      {
        id: 'proj-2',
        organisationId: 'org-1',
        name: 'Mobile App Development',
        description: 'Native iOS and Android applications',
        category: 'fixed',
        budgetHours: null,
        createdAt: now(),
      },
      {
        id: 'proj-3',
        organisationId: 'org-1',
        name: 'API Integration',
        description: 'Third-party API integrations for CRM and analytics',
        category: 'budget',
        budgetHours: 80,
        createdAt: now(),
      },
      // Creative Agency Co projects
      {
        id: 'proj-4',
        organisationId: 'org-2',
        name: 'Brand Identity Package',
        description: 'Logo, color palette, and brand guidelines',
        category: 'fixed',
        budgetHours: null,
        createdAt: now(),
      },
      {
        id: 'proj-5',
        organisationId: 'org-2',
        name: 'Social Media Campaign',
        description: 'Q1 social media content creation and management',
        category: 'budget',
        budgetHours: 120,
        createdAt: now(),
      },
      {
        id: 'proj-6',
        organisationId: 'org-2',
        name: 'Video Production',
        description: 'Promotional video series for product launch',
        category: 'budget',
        budgetHours: 60,
        createdAt: now(),
      },
    ]

    for (const project of testProjects) {
      await projectRepository.create(project)
    }
    console.log(`✓ Created ${testProjects.length} projects`)

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
    // SUMMARY
    // ========================================
    const duration = Date.now() - startTime
    console.log('\n✅ Database seeded successfully!')
    console.log(`⏱️  Completed in ${duration}ms\n`)

    console.log('📊 Summary:')
    console.log(`   Users: ${testUsers.length}`)
    console.log(`   Organisations: ${testOrganisations.length}`)
    console.log(`   Accounts: ${testAccounts.length}`)
    console.log(`   Projects: ${testProjects.length}`)
    console.log(`   Time Entries: ${testTimeEntries.length}`)
    console.log(`   Time Sheets: ${testTimeSheets.length}`)
    console.log(`   Time Sheet Entries: ${allSheetEntries.length}`)
    console.log('\n💡 Tip: Run `bun run db:studio` to view the data in Drizzle Studio')

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding
seedDatabase()
