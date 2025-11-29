import type { SystemRole, ProjectRole } from '@/schemas'

/**
 * System permissions - granted by users.role (super_admin, admin)
 * These are for platform administration, not project work.
 */
export const SYSTEM_PERMISSIONS = {
  // Users (platform-level)
  'users:view': 'View all platform users',
  'users:create': 'Create new users',
  'users:edit': 'Edit user accounts',
  'users:delete': 'Delete user accounts',

  // Organisations (platform-level)
  'organisations:view': 'View all organisations',
  'organisations:create': 'Create organisations',
  'organisations:edit': 'Edit organisations',
  'organisations:delete': 'Delete organisations',

  // Platform settings
  'platform:manage': 'Manage platform settings',
} as const

export type SystemPermission = keyof typeof SYSTEM_PERMISSIONS

/**
 * Project permissions - granted by projectMembers.role
 * Scoped to specific projects the user is a member of.
 */
export const PROJECT_PERMISSIONS = {
  // Time Entries (within project)
  'time-entries:view': 'View time entries',
  'time-entries:create': 'Create time entries',
  'time-entries:edit-own': 'Edit own time entries',
  'time-entries:edit-all': 'Edit any time entry',
  'time-entries:delete-own': 'Delete own time entries',
  'time-entries:delete-all': 'Delete any time entry',

  // Time Sheets (within project)
  'time-sheets:view': 'View time sheets',
  'time-sheets:create': 'Create time sheets',
  'time-sheets:edit': 'Edit time sheets',
  'time-sheets:submit': 'Submit time sheets for approval',
  'time-sheets:approve': 'Approve/reject time sheets',

  // Entry-level approval (within time sheets)
  'entries:question': 'Mark entries as questioned',
  'entries:approve': 'Approve individual entries',
  'entries:change-status': 'Change entry status',

  // Entry messages (threaded comments on entries)
  'messages:view': 'View entry messages',
  'messages:create': 'Create entry messages',
  'messages:delete-own': 'Delete own messages',
  'messages:delete-all': 'Delete any message',

  // Approval settings (project-level configuration)
  'approval-settings:view': 'View project approval settings',
  'approval-settings:edit': 'Edit project approval settings',

  // Project management
  'project:view': 'View project details',
  'project:edit': 'Edit project settings',
  'project:delete': 'Delete the project',
  'project:invite': 'Invite members to project',
  'project:manage-members': 'Manage project membership',

  // Contacts (within project context)
  'contacts:view': 'View project contacts',
  'contacts:invite': 'Invite contacts to project',
} as const

export type ProjectPermission = keyof typeof PROJECT_PERMISSIONS

// Combined for convenience
export const PERMISSIONS = {
  ...SYSTEM_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * System role to permission mapping
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, SystemPermission[]> = {
  super_admin: Object.keys(SYSTEM_PERMISSIONS) as SystemPermission[],

  admin: [
    'users:view',
    'users:create',
    'users:edit',
    // Note: admins cannot delete users
    'organisations:view',
    'organisations:create',
    'organisations:edit',
    'organisations:delete',
  ],
}

/**
 * Project role to permission mapping
 */
export const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, ProjectPermission[]> =
  {
    owner: [
      // Full project control
      'project:view',
      'project:edit',
      'project:delete',
      'project:invite',
      'project:manage-members',
      // Time entries - full access
      'time-entries:view',
      'time-entries:create',
      'time-entries:edit-own',
      'time-entries:edit-all',
      'time-entries:delete-own',
      'time-entries:delete-all',
      // Time sheets - full access
      'time-sheets:view',
      'time-sheets:create',
      'time-sheets:edit',
      'time-sheets:submit',
      'time-sheets:approve',
      // Entry-level approval - full access
      'entries:question',
      'entries:approve',
      'entries:change-status',
      // Messages - full access
      'messages:view',
      'messages:create',
      'messages:delete-own',
      'messages:delete-all',
      // Approval settings - full access
      'approval-settings:view',
      'approval-settings:edit',
      // Contacts
      'contacts:view',
      'contacts:invite',
    ],

    expert: [
      // Project - view only
      'project:view',
      // Time entries - CRUD own, view all
      'time-entries:view',
      'time-entries:create',
      'time-entries:edit-own',
      'time-entries:delete-own',
      // Time sheets - create and submit
      'time-sheets:view',
      'time-sheets:create',
      'time-sheets:edit',
      'time-sheets:submit',
      // Messages - view and create
      'messages:view',
      'messages:create',
      'messages:delete-own',
      // Approval settings - view only
      'approval-settings:view',
      // Contacts - view only
      'contacts:view',
    ],

    reviewer: [
      // Project - view only
      'project:view',
      // Time entries - view only
      'time-entries:view',
      // Time sheets - view and approve
      'time-sheets:view',
      'time-sheets:approve',
      // Entry-level approval - full access
      'entries:question',
      'entries:approve',
      'entries:change-status',
      // Messages - full access
      'messages:view',
      'messages:create',
      'messages:delete-own',
      'messages:delete-all',
      // Approval settings - view only
      'approval-settings:view',
      // Contacts - view only
      'contacts:view',
    ],

    client: [
      // Project - view only
      'project:view',
      // Time entries - view only
      'time-entries:view',
      // Time sheets - view only
      'time-sheets:view',
      // Entry-level approval - can question and approve
      'entries:question',
      'entries:approve',
      // Messages - view and create (can't delete others)
      'messages:view',
      'messages:create',
      'messages:delete-own',
      // Contacts - can invite others
      'contacts:view',
      'contacts:invite',
    ],

    viewer: [
      // Minimal read-only access
      'project:view',
      'time-entries:view',
      'time-sheets:view',
      // Messages - view only
      'messages:view',
    ],
  }

/**
 * Check if a user has a system permission (via users.role)
 */
export function hasSystemPermission(
  user: { role?: SystemRole | null },
  permission: SystemPermission
): boolean {
  if (!user.role) return false
  const permissions = SYSTEM_ROLE_PERMISSIONS[user.role] || []
  return permissions.includes(permission)
}

/**
 * Check if a user has a project permission (via projectMembers.role)
 */
export function hasProjectPermission(
  membership: { role: ProjectRole },
  permission: ProjectPermission
): boolean {
  const permissions = PROJECT_ROLE_PERMISSIONS[membership.role] || []
  return permissions.includes(permission)
}

/**
 * Check if user can perform action on a specific project
 * Combines system role check (admins can do anything) with project membership
 */
export function canOnProject(
  user: { role?: SystemRole | null },
  projectMembership: { role: ProjectRole } | null,
  permission: ProjectPermission
): boolean {
  // System admins have full access
  if (user.role === 'super_admin' || user.role === 'admin') {
    return true
  }

  // Check project membership
  if (!projectMembership) return false
  return hasProjectPermission(projectMembership, permission)
}

/**
 * Check if user has ANY of the specified project permissions
 */
export function hasAnyProjectPermission(
  membership: { role: ProjectRole },
  permissions: ProjectPermission[]
): boolean {
  return permissions.some((p) => hasProjectPermission(membership, p))
}

/**
 * Check if a role is a system (admin) role
 */
export function isSystemRole(role: string | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin'
}

/**
 * Get all project permissions for a role
 */
export function getProjectPermissionsForRole(
  role: ProjectRole
): ProjectPermission[] {
  return PROJECT_ROLE_PERMISSIONS[role] || []
}

/**
 * System routes that require system permissions
 */
export const SYSTEM_ROUTE_PERMISSIONS: Record<string, SystemPermission[]> = {
  '/dashboard/users': ['users:view'],
  '/dashboard/organisations': ['organisations:view'],
}

/**
 * Check if user can access a system route
 */
export function canAccessSystemRoute(
  user: { role?: SystemRole | null },
  route: string
): boolean {
  const requiredPermissions = SYSTEM_ROUTE_PERMISSIONS[route]
  if (!requiredPermissions) return true // Not a system route
  if (!user.role) return false
  return requiredPermissions.some((p) => hasSystemPermission(user, p))
}

/**
 * Project routes - accessible if user has ANY project membership
 * Specific project access is checked at the data level
 */
export const PROJECT_ROUTES = [
  '/dashboard/projects',
  '/dashboard/time-entries',
  '/dashboard/time-sheets',
  '/dashboard/contacts',
]

/**
 * Check if user can access project routes (has any project membership)
 */
export function canAccessProjectRoutes(
  projectMemberships: { projectId: string; role: ProjectRole }[]
): boolean {
  return projectMemberships.length > 0
}
