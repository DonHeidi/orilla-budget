import { createAuthClient } from 'better-auth/react'
import {
  adminClient,
  organizationClient,
  inferOrgAdditionalFields,
} from 'better-auth/client/plugins'
import type { auth } from './better-auth'

export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  plugins: [
    adminClient(),
    organizationClient({
      teams: { enabled: true },
      schema: inferOrgAdditionalFields<typeof auth>(),
    }),
  ],
})

// Export commonly used functions for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization,
  getSession,
} = authClient
