import { eq, schema } from '@aced/db'
import type { UserSummary } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError, isUniqueViolation } from '../errors.js'
import { currentUser, requireUser, toUserSummary } from '../user.js'

const patchBody = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, '3–20 letters, numbers or underscores')
    .optional(),
  bio: z.string().trim().max(280).nullable().optional(),
})

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me',
    { preHandler: requireUser },
    async (req): Promise<UserSummary> => toUserSummary(currentUser(req)),
  )

  app.patch(
    '/me',
    { preHandler: requireUser, schema: { body: patchBody } },
    async (req): Promise<UserSummary> => {
      const user = currentUser(req)
      if (Object.keys(req.body).length === 0) return toUserSummary(user)
      try {
        const [updated] = await app.db
          .update(schema.users)
          .set(req.body)
          .where(eq(schema.users.id, user.id))
          .returning()
        return toUserSummary(updated ?? user)
      } catch (err) {
        if (isUniqueViolation(err)) throw new HttpError(409, 'handle_taken', 'Handle is taken')
        throw err
      }
    },
  )
}
