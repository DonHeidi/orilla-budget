import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { organization } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '@/db'

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
