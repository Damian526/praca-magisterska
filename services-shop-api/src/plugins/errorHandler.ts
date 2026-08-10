import fp from 'fastify-plugin'
import { AppError } from '../lib/errors.js'

export default fp(async (app) => {
  app.setErrorHandler((error: unknown, request, reply) => {
    // 1. Nasze własne błędy biznesowe
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message }
      })
    }

    // 2. Błędy walidacji z JSON Schema (Fastify generuje je sam)
    if (error instanceof Error && 'validation' in error) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Nieprawidłowe dane wejściowe',
          details: (error as any).validation
        }
      })
    }

    // 3. Wszystko inne = nasz błąd, logujemy pełny ślad
    request.log.error({ err: error }, 'Nieobsłużony błąd')
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Wewnętrzny błąd serwera' }
    })
  })

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Nie znaleziono: ${request.method} ${request.url}`
      }
    })
  })
})