import { type Db, schema } from '@aced/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { uniqueHandle } from './handles.js'

export interface AuthOptions {
  secret?: string
  baseUrl: string
  webOrigin: string
  /** Parent domain shared by web and API (e.g. `.aced.gg`), so the session cookie reaches both. */
  cookieDomain?: string
  google?: { clientId: string; clientSecret: string }
  discord?: { clientId: string; clientSecret: string }
}

export function createAuth(db: Db, options: AuthOptions) {
  return betterAuth({
    secret: options.secret,
    baseURL: options.baseUrl,
    basePath: '/auth',
    trustedOrigins: [options.webOrigin],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    advanced: {
      database: { generateId: 'uuid' },
      // Secure cookies follow from an https baseURL; SameSite stays Lax.
      ...(options.cookieDomain && {
        crossSubDomainCookies: { enabled: true, domain: options.cookieDomain },
      }),
    },
    socialProviders: {
      ...(options.google && { google: options.google }),
      ...(options.discord && { discord: options.discord }),
    },
    user: {
      additionalFields: {
        handle: { type: 'string', required: false, input: false },
        role: { type: 'string', required: false, input: false, defaultValue: 'user' },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: { ...user, handle: await uniqueHandle(db, user.name) },
          }),
        },
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
