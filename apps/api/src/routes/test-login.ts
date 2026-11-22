import { eq, schema } from '@aced/db'
import { makeSignature } from 'better-auth/crypto'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'

/**
 * Signs in as an existing user without OAuth, for end-to-end tests. Only registered when the app
 * is built with `testLogin` (NODE_ENV=test), so it can't exist in production.
 */
export const testLoginRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/test-login',
    { schema: { body: z.object({ handle: z.string().min(1).max(20) }) } },
    async (req, reply) => {
      const [user] = await app.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.handle, req.body.handle))
      if (!user) throw new HttpError(404, 'not_found', 'User not found')
      const ctx = await app.auth.$context
      const { token } = await ctx.internalAdapter.createSession(user.id)
      const value = `${token}.${await makeSignature(token, ctx.secret)}`
      reply.header(
        'set-cookie',
        `${ctx.authCookies.sessionToken.name}=${value}; Path=/; HttpOnly; SameSite=Lax`,
      )
      return reply.code(204).send()
    },
  )
}
