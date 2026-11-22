import type { ApiError, ApiErrorCode } from '@aced/types'
import type { FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

function apiError(code: ApiErrorCode, message: string): ApiError {
  return { error: { code, message } }
}

export function registerErrorHandlers(app: FastifyInstance) {
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send(apiError('not_found', `Route ${req.method} ${req.url} not found`))
  })

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send(apiError('bad_request', err.message))
    }
    const status =
      typeof err === 'object' && err !== null && 'statusCode' in err ? err.statusCode : 500
    // Fastify's own client errors (bad JSON, body too large, …) are safe to show.
    if (typeof status === 'number' && status >= 400 && status < 500 && err instanceof Error) {
      return reply
        .code(status)
        .send(apiError(status === 404 ? 'not_found' : 'bad_request', err.message))
    }
    req.log.error({ err }, 'unhandled error')
    return reply.code(500).send(apiError('internal', 'Internal server error'))
  })
}
