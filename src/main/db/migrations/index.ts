import init from './0000_init.sql?raw'

/**
 * Every migration, in order. drizzle-kit writes the SQL (see drizzle.config.ts); each new file
 * is imported here so Vite bundles it into main and there's no migrations folder to ship.
 * Never edit or reorder a migration once it has been released; add a new one instead.
 */
export const MIGRATIONS: readonly { name: string; sql: string }[] = [
  { name: '0000_init', sql: init },
]
