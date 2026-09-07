import { connectDB } from './db'
import { fail } from './apiResponse'
import { ApiError } from './auth'
import { runRequestContext } from './tenantContext'

function skipsDbConnection(req) {
  if (process.env.NODE_ENV === 'production') return false
  const pathname = new URL(req.url).pathname
  return pathname === '/api/auth/dev-login'
}

function isDatabaseConnectivityError(err) {
  const names = new Set([
    'MongoServerSelectionError',
    'MongooseServerSelectionError',
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoTimeoutError',
  ])
  const codes = new Set(['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'])
  for (let error = err, depth = 0; error && depth < 6; error = error.cause, depth++) {
    if (names.has(error.name) || codes.has(error.code)) return true
  }
  return false
}

// Wraps a Next.js route handler: opens the Mongo connection, and converts
// any thrown ApiError (or Mongoose validation error) into the standard
// error envelope instead of an unhandled 500.
export function withApi(handler) {
  return async (req, ctx) => {
    return runRequestContext(async () => {
      const startedAt = Date.now()
      const pathname = new URL(req.url).pathname
      try {
        // Only the dev-login endpoint itself is backed by local dev data.
        // Real data APIs must still connect, even when the current user is a
        // dev-login super admin; otherwise Mongoose queries buffer for 10s.
        if (!skipsDbConnection(req)) {
          await connectDB()
        }
        const response = await handler(req, ctx)
        const elapsedMs = Date.now() - startedAt
        const slowLogMs = Number(process.env.API_SLOW_LOG_MS || 1000)
        if (elapsedMs >= slowLogMs) {
          console.warn(`[api:slow] ${req.method} ${pathname} ${elapsedMs}ms`)
        }
        return response
      } catch (err) {
        const elapsedMs = Date.now() - startedAt
        if (elapsedMs >= Number(process.env.API_SLOW_LOG_MS || 1000)) {
          console.warn(`[api:slow] ${req.method} ${pathname} ${elapsedMs}ms failed`)
        }
        if (err instanceof ApiError) {
          return fail(err.message, err.status, err.errorCode)
        }
        if (err?.status) {
          return fail(err.message, err.status, err.errorCode)
        }
        if (err?.name === 'ValidationError') {
          return fail(err.message, 400, 'VALIDATION_ERROR')
        }
        if (err?.code === 11000) {
          return fail('A record with this value already exists', 400, 'DUPLICATE')
        }
        if (isDatabaseConnectivityError(err)) {
          return fail(
            'MongoDB is unreachable. Add this machine IP to Atlas Network Access or configure a reachable local MongoDB URI.',
            503,
            'DATABASE_UNAVAILABLE'
          )
        }
        console.error(err)
        return fail('Internal server error', 500, 'INTERNAL_ERROR')
      }
    })
  }
}
