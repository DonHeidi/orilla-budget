import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'
import * as betterAuthSchema from './better-auth-schema'

const sqlite = new Database('./data.db')
export const db = drizzle(sqlite, { schema: { ...schema, ...betterAuthSchema } })

export * from './schema'
export * as betterAuth from './better-auth-schema'
