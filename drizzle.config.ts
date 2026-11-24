import { defineConfig } from 'drizzle-kit'

// `npx drizzle-kit generate --name <name>` writes a new SQL migration from src/main/db/schema.ts.
// Then import it in src/main/db/migrations/index.ts so it's bundled into main.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/db/schema.ts',
  out: './src/main/db/migrations',
})
