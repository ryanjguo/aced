import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: ['GET', 'POST'],
    url: '/auth/*',
    // Sign-in attempts per IP.
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: async (req, reply) => {
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) headers.append(key, String(value))
      }
      const res = await app.auth.handler(
        new Request(new URL(req.url, `${req.protocol}://${req.host}`), {
          method: req.method,
          headers,
          body: req.body === undefined ? undefined : JSON.stringify(req.body),
        }),
      )
      reply.status(res.status)
      for (const cookie of res.headers.getSetCookie()) reply.header('set-cookie', cookie)
      res.headers.forEach((value, key) => {
        if (key !== 'set-cookie') reply.header(key, value)
      })
      return reply.send(res.body ? await res.text() : null)
    },
  })
}
