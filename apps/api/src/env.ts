try {
  process.loadEnvFile('../../.env')
} catch {}

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

function oauth(prefix: string) {
  const clientId = process.env[`${prefix}_CLIENT_ID`]
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]
  return clientId && clientSecret ? { clientId, clientSecret } : undefined
}

const port = Number(process.env.PORT ?? 4000)

export const env = {
  port,
  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL'),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  auth: {
    secret: process.env.BETTER_AUTH_SECRET || undefined,
    baseUrl: process.env.BETTER_AUTH_URL || `http://localhost:${port}`,
    google: oauth('GOOGLE'),
    discord: oauth('DISCORD'),
  },
}
