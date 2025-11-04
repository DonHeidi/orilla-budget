import { db } from '../src/db'
import { users, organisations, accounts, projects, timeEntries } from '../src/db/schema'

// Clear existing data
await db.delete(timeEntries)
await db.delete(projects)
await db.delete(accounts)
await db.delete(organisations)
await db.delete(users)

// Insert test users
const testUsers = [
  {
    id: 'user-1',
    handle: 'jdoe',
    email: 'john.doe@example.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-2',
    handle: 'asmith',
    email: 'alice.smith@example.com',
    createdAt: new Date().toISOString(),
  },
]

await db.insert(users).values(testUsers)
console.log(`✓ Created ${testUsers.length} test users`)

// Insert test organisations
const testOrganisations = [
  {
    id: 'org-1',
    name: 'Acme Corporation',
    contactName: 'John Doe',
    contactEmail: 'john@acme.com',
    totalBudgetHours: 1000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'org-2',
    name: 'TechStart Inc',
    contactName: 'Jane Smith',
    contactEmail: 'jane@techstart.com',
    totalBudgetHours: 500,
    createdAt: new Date().toISOString(),
  },
]

await db.insert(organisations).values(testOrganisations)
console.log(`✓ Created ${testOrganisations.length} test organisations`)

// Insert test accounts
const testAccounts = [
  {
    id: 'acc-1',
    userId: 'user-1',
    organisationId: 'org-1',
    name: 'John Doe',
    email: 'john@acme.com',
    role: 'contact' as const,
    accessCode: 'ACME2025',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-2',
    userId: 'user-2',
    organisationId: 'org-2',
    name: 'Alice Smith',
    email: 'alice@techstart.com',
    role: 'project_manager' as const,
    accessCode: 'TECH2025',
    createdAt: new Date().toISOString(),
  },
]

await db.insert(accounts).values(testAccounts)
console.log(`✓ Created ${testAccounts.length} test accounts`)

// Insert test projects
const testProjects = [
  {
    id: 'proj-1',
    organisationId: 'org-1',
    name: 'Website Redesign',
    description: 'Complete redesign of company website',
    category: 'budget' as const,
    budgetHours: 200,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    organisationId: 'org-1',
    name: 'Mobile App',
    description: 'Native mobile application',
    category: 'fixed' as const,
    budgetHours: 400,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-3',
    organisationId: 'org-2',
    name: 'API Development',
    description: 'RESTful API backend',
    category: 'budget' as const,
    budgetHours: 150,
    createdAt: new Date().toISOString(),
  },
]

await db.insert(projects).values(testProjects)
console.log(`✓ Created ${testProjects.length} test projects`)

// Insert test time entries
const testTimeEntries = [
  {
    id: 'time-1',
    projectId: 'proj-1',
    organisationId: 'org-1',
    title: 'Initial wireframes',
    description: 'Created wireframes for homepage and key pages',
    hours: 8,
    date: '2025-01-15',
    approvedDate: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'time-2',
    projectId: 'proj-1',
    organisationId: 'org-1',
    title: 'Design mockups',
    description: 'High-fidelity mockups in Figma',
    hours: 12,
    date: '2025-01-16',
    approvedDate: '2025-01-17',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'time-3',
    projectId: 'proj-2',
    organisationId: 'org-1',
    title: 'Setup project structure',
    description: 'Initialize React Native project',
    hours: 4,
    date: '2025-01-18',
    approvedDate: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'time-4',
    projectId: 'proj-3',
    organisationId: 'org-2',
    title: 'API architecture planning',
    description: 'Designed REST endpoints and data models',
    hours: 6,
    date: '2025-01-20',
    approvedDate: null,
    createdAt: new Date().toISOString(),
  },
]

await db.insert(timeEntries).values(testTimeEntries)
console.log(`✓ Created ${testTimeEntries.length} test time entries`)

console.log('\n✅ Database seeded successfully!')
