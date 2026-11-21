try {
  process.loadEnvFile('../../.env')
} catch {}

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL'),
}
