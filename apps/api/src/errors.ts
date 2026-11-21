import type { ApiError, ApiErrorCode } from '@aced/types'
import * as Sentry from '@sentry/node'
import type { FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly extra: { retryAfter?: number } = {},
  ) {
    super(message)
  }
}

export function isUniqueViolation(err: unknown): boolean {
  const pgError = err instanceof Error && err.cause instanceof Error ? err.cause : err
  return (
    typeof pgError === 'object' && pgError !== null && 'code' in pgError && pgError.code === '23505'
  )
}

function apiError(code: ApiErrorCode, message: string): ApiError {
  return { error: { code, message } }
}

export function registerErrorHandlers(app: FastifyInstance) {
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send(apiError('not_found', `Route ${req.method} ${req.url} not found`))
  })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      if (err.extra.retryAfter) reply.header('retry-after', err.extra.retryAfter)
      return reply
        .code(err.statusCode)
        .send({ error: { code: err.code, message: err.message, ...err.extra } })
    }
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
    Sentry.captureException(err)
    return reply.code(500).send(apiError('internal', 'Internal server error'))
  })
}
