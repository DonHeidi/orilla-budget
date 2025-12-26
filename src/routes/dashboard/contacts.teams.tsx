import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Building2, FolderKanban, User } from 'lucide-react'
import { db } from '@/db'
import { project } from '@/db/schema'
import * as betterAuth from '@/db/better-auth-schema'
import { eq, inArray } from 'drizzle-orm'
import { getCurrentUser } from '@/repositories/auth.repository'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface TeamMember {
  userId: string
  name: string | null
  email: string
  role: string
}

interface TeamWithMembers {
  id: string
  teamId: string
  name: string
  category: string | null
  budgetHours: number | null
  organisationId: string | null
  organisationName: string | null
  members: TeamMember[]
}

interface TeamsData {
  teams: TeamWithMembers[]
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  expert: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  reviewer:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  client: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

const getTeamsDataFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TeamsData> => {
    const user = await getCurrentUser()
    if (!user) {
      return { teams: [] }
    }

    // Get user's team memberships
    const memberships = await db
      .select({
        teamId: betterAuth.teamMember.teamId,
      })
      .from(betterAuth.teamMember)
      .where(eq(betterAuth.teamMember.userId, user.id))

    if (memberships.length === 0) {
      return { teams: [] }
    }

    const teamIds = memberships.map((m) => m.teamId)

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

    // Get all members for these teams with their user details
    const allMembers = await db
      .select({
        teamId: betterAuth.teamMember.teamId,
        userId: betterAuth.teamMember.userId,
        role: betterAuth.teamMember.projectRole,
        userName: betterAuth.user.name,
        userEmail: betterAuth.user.email,
      })
      .from(betterAuth.teamMember)
      .innerJoin(
        betterAuth.user,
        eq(betterAuth.teamMember.userId, betterAuth.user.id)
      )
      .where(inArray(betterAuth.teamMember.teamId, teamIds))

    // Group members by team
    const membersByTeam = new Map<string, TeamMember[]>()
    for (const member of allMembers) {
      const teamMembers = membersByTeam.get(member.teamId) || []
      teamMembers.push({
        userId: member.userId,
        name: member.userName,
        email: member.userEmail,
        role: member.role,
      })
      membersByTeam.set(member.teamId, teamMembers)
    }

    // Combine all data
    const teams: TeamWithMembers[] = projects.map((p) => ({
      id: p.id,
      teamId: p.teamId,
      name: p.name,
      category: p.category,
      budgetHours: p.budgetHours,
      organisationId: p.organisationId,
      organisationName: p.organisationName,
      members: membersByTeam.get(p.teamId) || [],
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

  if (data.teams.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>You are not a member of any teams yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.teams.map((team) => (
        <Card
          key={team.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() =>
            navigate({
              to: '/dashboard/projects/$id',
              params: { id: team.teamId },
            })
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{team.name}</CardTitle>
            </div>
            {team.organisationName && (
              <CardDescription className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {team.organisationName}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">
                Members ({team.members.length})
              </p>
              <div className="space-y-1.5">
                {team.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {member.name || member.email}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs capitalize shrink-0 ${roleColors[member.role] || roleColors.viewer}`}
                    >
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
