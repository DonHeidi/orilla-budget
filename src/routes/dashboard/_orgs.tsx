import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Building2, Users } from 'lucide-react'
import { organisationRepository } from '@/repositories/organisation.repository'
import { accountRepository } from '@/repositories/account.repository'
import { projectRepository } from '@/repositories/project.repository'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'

// Server function to load shared data
const getAllDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const organisations = await organisationRepository.findAll()
  const accounts = await accountRepository.findAll()
  const projects = await projectRepository.findAll()
  const timeEntries = await timeEntryRepository.findAll()

  return {
    organisations: organisations,
    accounts: accounts,
    projects: projects,
    timeEntries: timeEntries,
  }
})

// Pathless layout route definition
export const Route = createFileRoute('/dashboard/_orgs')({
  loader: () => getAllDataFn(),
})
