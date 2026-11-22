import { and, desc, eq, inArray, schema } from '@aced/db'
import type { Follow, FollowTargetType } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { rateLimit } from '../moderation.js'
import { currentUser, requireUser } from '../user.js'

const { follows, players, teams, events, users } = schema

const target = z.object({
  targetType: z.enum(['player', 'team', 'event', 'user']),
  targetId: z.uuid(),
})

const tables = { player: players, team: teams, event: events, user: users }

export const followRoutes: FastifyPluginAsyncZod = async (app) => {
  app.put(
    '/follows/:targetType/:targetId',
    { preHandler: requireUser, schema: { params: target } },
    async (req, reply) => {
      const user = currentUser(req)
      await rateLimit(app, user, 'follow')
      const { targetType, targetId } = req.params
      if (targetType === 'user' && targetId === user.id) {
        throw new HttpError(400, 'bad_request', "You can't follow yourself")
      }
      const table = tables[targetType]
      const [found] = await app.db
        .select({ id: table.id })
        .from(table)
        .where(eq(table.id, targetId))
      if (!found) throw new HttpError(404, 'not_found', `${targetType} not found`)
      await app.db
        .insert(follows)
        .values({ userId: user.id, targetType, targetId })
        .onConflictDoNothing()
      return reply.code(204).send()
    },
  )

  app.delete(
    '/follows/:targetType/:targetId',
    { preHandler: requireUser, schema: { params: target } },
    async (req, reply) => {
      const { targetType, targetId } = req.params
      await rateLimit(app, currentUser(req), 'follow')
      await app.db
        .delete(follows)
        .where(
          and(
            eq(follows.userId, currentUser(req).id),
            eq(follows.targetType, targetType),
            eq(follows.targetId, targetId),
          ),
        )
      return reply.code(204).send()
    },
  )

  app.get(
    '/follows/:targetType/:targetId',
    { preHandler: requireUser, schema: { params: target } },
    async (req): Promise<{ following: boolean }> => {
      const { targetType, targetId } = req.params
      const [row] = await app.db
        .select({ userId: follows.userId })
        .from(follows)
        .where(
          and(
            eq(follows.userId, currentUser(req).id),
            eq(follows.targetType, targetType),
            eq(follows.targetId, targetId),
          ),
        )
      return { following: row !== undefined }
    },
  )

  app.get('/me/follows', { preHandler: requireUser }, async (req): Promise<{ items: Follow[] }> => {
    const rows = await app.db
      .select()
      .from(follows)
      .where(eq(follows.userId, currentUser(req).id))
      .orderBy(desc(follows.createdAt))
    const ids = (type: FollowTargetType) =>
      rows.filter((r) => r.targetType === type).map((r) => r.targetId)
    const [p, t, e, u] = await Promise.all([
      ids('player').length
        ? app.db
            .select({ id: players.id, name: players.handle, slug: players.slug })
            .from(players)
            .where(inArray(players.id, ids('player')))
        : [],
      ids('team').length
        ? app.db
            .select({ id: teams.id, name: teams.name, slug: teams.slug })
            .from(teams)
            .where(inArray(teams.id, ids('team')))
        : [],
      ids('event').length
        ? app.db
            .select({ id: events.id, name: events.name, slug: events.slug })
            .from(events)
            .where(inArray(events.id, ids('event')))
        : [],
      ids('user').length
        ? app.db
            .select({ id: users.id, name: users.handle, slug: users.handle })
            .from(users)
            .where(inArray(users.id, ids('user')))
        : [],
    ])
    const named = { player: p, team: t, event: e, user: u }
    return {
      items: rows.flatMap((r) => {
        const entity = named[r.targetType].find((x) => x.id === r.targetId)
        return entity ? [{ type: r.targetType, ...entity }] : []
      }),
    }
  })
}
