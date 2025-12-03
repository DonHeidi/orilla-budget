/**
 * Auth Module - Consolidated
 *
 * This file consolidates all authentication-related code:
 * - Better Auth configuration
 * - TypeScript types
 * - Utility functions
 */

import { randomBytes } from 'crypto'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { organization } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '@/db'
import type { SystemPermission, ProjectPermission } from './permissions'

// =============================================================================
// BETTER AUTH CONFIGURATION
// =============================================================================

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),

  emailAndPassword: {
    enabled: true,
    password: {
      // Use Bun's Argon2id for backwards compatibility with existing hashes
      hash: async (password) => {
        return await Bun.password.hash(password, {
          algorithm: 'argon2id',
          memoryCost: 19456, // 19 MiB - matches existing config
          timeCost: 2,
        })
      },
      verify: async ({ hash, password }) => {
        return await Bun.password.verify(password, hash)
      },
    },
  },

  plugins: [
    admin({
      adminRoles: ['super_admin', 'admin'],
    }),
    organization({
      teams: {
        enabled: true, // Projects become teams
      },
      schema: {
        organization: {
          additionalFields: {
            // Preserve existing organisation fields
            contactName: {
              type: 'string',
              required: false,
              input: true,
            },
            contactEmail: {
              type: 'string',
              required: false,
              input: true,
            },
            contactPhone: {
              type: 'string',
              required: false,
              input: true,
            },
          },
        },
        team: {
          additionalFields: {
            // Preserve existing project fields
            description: {
              type: 'string',
              required: false,
              input: true,
            },
            category: {
              type: 'string',
              required: false,
              input: true,
            },
            budgetHours: {
              type: 'number',
              required: false,
              input: true,
            },
          },
        },
        teamMember: {
          additionalFields: {
            // Project-specific roles (owner, expert, reviewer, client, viewer)
            projectRole: {
              type: 'string',
              required: true,
              defaultValue: 'viewer',
              input: true,
            },
          },
        },
      },
    }),
    tanstackStartCookies(), // Must be last for TanStack Start cookie handling
  ],

  user: {
    additionalFields: {
      handle: {
        type: 'string',
        required: false,
        input: true,
      },
      piiId: {
        type: 'string',
        required: false,
        input: false,
      },
      lastLoginAt: {
        type: 'string',
        required: false,
        input: false,
      },
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (matches existing config)
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

// =============================================================================
// TYPES
// =============================================================================

/**
 * Authenticated user from session
 */
export interface AuthenticatedUser {
  id: string
  handle: string
  email: string
  role: 'super_admin' | 'admin' | null
  pii?: {
    name?: string | null
  }
}

/**
 * Project membership with details
 * Organisation fields are nullable for projects without an organisation
 */
export interface ProjectMembership {
  projectId: string
  projectName: string
  organisationId: string | null
  organisationName: string | null
  role: 'owner' | 'expert' | 'reviewer' | 'client' | 'viewer'
}

/**
 * Session data returned from server
 */
export interface AuthSession {
  user: AuthenticatedUser | null
  projectMemberships: ProjectMembership[]
}

/**
 * Auth context value provided to components
 */
export interface AuthContextValue {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isSystemAdmin: boolean

  projectMemberships: ProjectMembership[]

  // System permission helpers
  canSystem: (permission: SystemPermission) => boolean

  // Project permission helpers
  canOnProject: (projectId: string, permission: ProjectPermission) => boolean
  canAnyOnProject: (projectId: string, permissions: ProjectPermission[]) => boolean
  getProjectRole: (projectId: string) => string | null
  getProjectMembership: (projectId: string) => ProjectMembership | null

  // Actions
  logout: () => Promise<void>
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SESSION_TOKEN_LENGTH = 32
const SESSION_EXPIRY_DAYS = 7

/**
 * Cookie configuration for session tokens
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS, // 7 days in seconds
}

export const SESSION_COOKIE_NAME = 'session_token'

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a unique ID (UUIDv4)
 * Uses Web Crypto API which is available in both browsers and Node.js
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString()
}

/**
 * Hash a password using Bun's built-in Argon2id implementation
 */
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
  })
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await Bun.password.verify(password, hash)
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_LENGTH).toString('base64url')
}

/**
 * Calculate session expiry timestamp
 */
export function getSessionExpiry(days: number = SESSION_EXPIRY_DAYS): string {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + days)
  return expiry.toISOString()
}

/**
 * Check if a session has expired
 */
export function isSessionExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Generate a cryptographically secure token of specified length
 * Used for invitation codes, password reset tokens, etc.
 */
export function generateToken(length: number = 32): string {
  // Calculate bytes needed for the desired character length in base64url
  const bytesNeeded = Math.ceil((length * 3) / 4)
  return randomBytes(bytesNeeded).toString('base64url').slice(0, length)
}
