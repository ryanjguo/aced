import { defineConfig } from 'drizzle-kit'

try {
  process.loadEnvFile('../../.env')
} catch {}

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url },
  casing: 'snake_case',
  strict: true,
  verbose: true,
})
