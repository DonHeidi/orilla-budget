import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { type ColumnDef } from '@tanstack/react-table'
import { Building2, Users, FolderKanban } from 'lucide-react'
import { db } from '@/db'
import { project } from '@/db/schema'
import * as betterAuth from '@/db/better-auth-schema'
import { eq, inArray, count } from 'drizzle-orm'
import { getCurrentUser } from '@/repositories/auth.repository'
import { DataTable } from '@/components/DataTable'

interface TeamWithDetails {
  id: string
  teamId: string
  name: string
  category: string | null
  budgetHours: number | null
  organisationId: string | null
  organisationName: string | null
  role: string
  memberCount: number
}

interface TeamsData {
  teams: TeamWithDetails[]
}

const getTeamsDataFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TeamsData> => {
    const user = await getCurrentUser()
    if (!user) {
      return { teams: [] }
    }

    // Get user's team memberships with their role
    const memberships = await db
      .select({
        teamId: betterAuth.teamMember.teamId,
        role: betterAuth.teamMember.projectRole,
      })
      .from(betterAuth.teamMember)
      .where(eq(betterAuth.teamMember.userId, user.id))

    if (memberships.length === 0) {
      return { teams: [] }
    }

    const teamIds = memberships.map((m) => m.teamId)
    const roleMap = new Map(memberships.map((m) => [m.teamId, m.role]))

    // Get projects with organisation details
    const projects = await db
      .select({
        id: project.id,
        teamId: project.teamId,
        name: project.name,
        category: project.category,
        budgetHours: project.budgetHours,
        organisationId: project.organisationId,
        organisationName: betterAuth.organization.name,
      })
      .from(project)
      .leftJoin(
        betterAuth.organization,
        eq(project.organisationId, betterAuth.organization.id)
      )
      .where(inArray(project.teamId, teamIds))

    // Get member counts for each team
    const memberCounts = await db
      .select({
        teamId: betterAuth.teamMember.teamId,
        count: count(),
      })
      .from(betterAuth.teamMember)
      .where(inArray(betterAuth.teamMember.teamId, teamIds))
      .groupBy(betterAuth.teamMember.teamId)

    const countMap = new Map(memberCounts.map((m) => [m.teamId, m.count]))

    // Combine all data
    const teams: TeamWithDetails[] = projects.map((p) => ({
      id: p.id,
      teamId: p.teamId,
      name: p.name,
      category: p.category,
      budgetHours: p.budgetHours,
      organisationId: p.organisationId,
      organisationName: p.organisationName,
      role: roleMap.get(p.teamId) || 'viewer',
      memberCount: countMap.get(p.teamId) || 0,
    }))

    return { teams }
  }
)

export const Route = createFileRoute('/dashboard/contacts/teams')({
  component: TeamsPage,
  loader: () => getTeamsDataFn(),
})

function TeamsPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  const columns: ColumnDef<TeamWithDetails>[] = [
    {
      accessorKey: 'name',
      header: 'Project',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: 'organisation',
      header: 'Organisation',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.organisationName ? (
            <>
              <Building2 className="h-4 w-4 text-gray-500" />
              <span>{row.original.organisationName}</span>
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Your Role',
      cell: ({ row }) => {
        const role = row.original.role
        const roleColors: Record<string, string> = {
          owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          expert: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          reviewer: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          client: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs capitalize ${roleColors[role] || roleColors.viewer}`}>
            {role}
          </span>
        )
      },
    },
    {
      id: 'members',
      header: 'Members',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span>{row.original.memberCount}</span>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-gray-600 dark:text-gray-400 capitalize">
          {row.original.category || '-'}
        </span>
      ),
    },
  ]

  return (
    <>
      {data.teams.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>You are not a member of any teams yet.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data.teams}
          getRowId={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: '/dashboard/projects/$id',
              params: { id: row.original.teamId },
            })
          }}
        />
      )}
    </>
  )
}
