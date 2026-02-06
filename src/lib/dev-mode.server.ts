import { createServerFn } from '@tanstack/react-start'
import { userRepository } from '@/repositories/user.repository'
import { projectMemberRepository } from '@/repositories/projectMember.repository'
import { authRepository } from '@/repositories/auth.repository'
import { getRequest } from '@tanstack/react-start/server'

export interface DevUser {
  id: string
  name: string
  email: string
  handle: string | null
  systemRole: 'super_admin' | 'admin' | null
  projectMemberships: Array<{
    projectName: string
    role: string
  }>
}

export const getDevUsersFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ users: DevUser[]; currentUserId: string | null }> => {
    if (process.env.NODE_ENV !== 'development') {
      return { users: [], currentUserId: null }
    }

    // Get current session
    let currentUserId: string | null = null
    try {
      const request = getRequest()
      const session = await authRepository.getSession(request.headers)
      currentUserId = session?.user?.id ?? null
    } catch {
      // Not logged in
    }

    const allUsers = await userRepository.findAll()

    const users = await Promise.all(
      allUsers.map(async (user) => {
        const memberships =
          await projectMemberRepository.findMembershipsForAuth(user.id)

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          handle: user.handle,
          systemRole: user.role as 'super_admin' | 'admin' | null,
          projectMemberships: memberships.map((m) => ({
            projectName: m.projectName,
            role: m.role,
          })),
        }
      })
    )

    return { users, currentUserId }
  }
)
