import { Database } from 'bun:sqlite'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const DB_PATH = './data.db'
const MIGRATIONS_PATH = './drizzle'

async function migrate() {
  const db = new Database(DB_PATH, { create: true })

  // Create migrations tracking table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `)

  // Get applied migrations
  const applied = new Set(
    db
      .query<{ hash: string }, []>('SELECT hash FROM __drizzle_migrations')
      .all()
      .map((r) => r.hash)
  )

  // Get all migration files
  const files = (await readdir(MIGRATIONS_PATH))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let migrationsRan = 0

  for (const file of files) {
    const hash = file.replace('.sql', '')

    if (applied.has(hash)) {
      console.log(`✓ ${file} (already applied)`)
      continue
    }

    console.log(`→ Applying ${file}...`)

    const sql = await readFile(join(MIGRATIONS_PATH, file), 'utf-8')

    // Split by statement-breakpoint and run each statement
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    db.transaction(() => {
      for (const statement of statements) {
        db.run(statement)
      }
      db.run(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        [hash, Date.now()]
      )
    })()

    console.log(`  ✓ Applied ${file}`)
    migrationsRan++
  }

  if (migrationsRan === 0) {
    console.log('\nNo new migrations to apply.')
  } else {
    console.log(`\n✓ Applied ${migrationsRan} migration(s).`)
  }

  db.close()
}

migrate().catch(console.error)
