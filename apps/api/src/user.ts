import { type Db, eq, schema, type UserRow } from '@aced/db'
import type { UserRole, UserSummary } from '@aced/types'
import { fromNodeHeaders } from 'better-auth/node'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { HttpError } from './errors.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: UserRow | undefined
  }
}

async function findUser(db: Db, id: string) {
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, id))
  return row
}

/** Sets `request.user` from the session cookie on every request. */
export function registerCurrentUser(app: FastifyInstance) {
  app.decorateRequest('user', undefined)
  app.addHook('onRequest', async (req) => {
    if (!req.headers.cookie) return
    const session = await app.auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
    if (session) req.user = await findUser(app.db, session.user.id)
  })
}

/** Requires a signed-in user; banned users can still read but not write. */
export async function requireUser(req: FastifyRequest) {
  const user = currentUser(req)
  if (req.method !== 'GET' && user.bannedUntil && user.bannedUntil > new Date()) {
    throw new HttpError(403, 'banned', `You're banned until ${user.bannedUntil.toISOString()}`)
  }
}

const rank: Record<UserRole, number> = { user: 0, moderator: 1, admin: 2 }

/** Whether role `a` is strictly above role `b`. */
export const outranks = (a: UserRole, b: UserRole) => rank[a] > rank[b]

export function requireRole(role: Exclude<UserRole, 'user'>) {
  return async (req: FastifyRequest) => {
    if (rank[currentUser(req).role] < rank[role]) {
      throw new HttpError(403, 'forbidden', `Requires ${role} role`)
    }
  }
}

/** `request.user` after `requireUser` has run. */
export function currentUser(req: FastifyRequest): UserRow {
  if (!req.user) throw new HttpError(401, 'unauthorized', 'Sign in required')
  return req.user
}

export function toUserSummary(user: UserRow): UserSummary {
  return { id: user.id, handle: user.handle, avatarUrl: user.image, role: user.role }
}
