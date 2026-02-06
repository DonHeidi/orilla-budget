/**
 * Reset Database
 *
 * Drops ALL tables and re-runs migrations from scratch.
 * Then optionally seeds test data.
 *
 * Usage:
 *   bun scripts/reset-db.ts          # Reset + migrate only
 *   bun scripts/reset-db.ts --seed   # Reset + migrate + seed
 */

import { Database } from 'bun:sqlite'

const shouldSeed = process.argv.includes('--seed')

const sqlite = new Database('./data.db')

// Get all table names
const tables = sqlite
  .query<{ name: string }, []>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  )
  .all()
  .map((r) => r.name)

console.log(`Dropping ${tables.length} tables...`)

sqlite.exec('PRAGMA foreign_keys = OFF')

for (const table of tables) {
  sqlite.exec(`DROP TABLE IF EXISTS "${table}"`)
  console.log(`  Dropped ${table}`)
}

sqlite.exec('PRAGMA foreign_keys = ON')
sqlite.close()

console.log('All tables dropped. Running migrations...')

// Run migrations
const migrateProc = Bun.spawnSync(['bun', 'scripts/migrate.ts'], {
  cwd: import.meta.dir + '/..',
  stdout: 'inherit',
  stderr: 'inherit',
})

if (migrateProc.exitCode !== 0) {
  console.error('Migration failed!')
  process.exit(1)
}

console.log('Migrations complete.')

if (shouldSeed) {
  console.log('Seeding test data...')
  const seedProc = Bun.spawnSync(['bun', 'scripts/seed-test-data.ts'], {
    cwd: import.meta.dir + '/..',
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (seedProc.exitCode !== 0) {
    console.error('Seeding failed!')
    process.exit(1)
  }
}

console.log('Done!')
