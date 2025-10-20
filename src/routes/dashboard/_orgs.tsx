import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Building2, Users } from 'lucide-react'
import { organisationRepository } from '@/server/repositories/organisation.repository'
import { accountRepository } from '@/server/repositories/account.repository'

// Server function to load shared data
const getAllDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const organisations = await organisationRepository.findAll()
  const accounts = await accountRepository.findAll()

  return {
    organisations: JSON.parse(JSON.stringify(organisations)),
    accounts: JSON.parse(JSON.stringify(accounts)),
  }
})

// Pathless layout route definition
export const Route = createFileRoute('/dashboard/_orgs')({
  loader: () => getAllDataFn(),
})
