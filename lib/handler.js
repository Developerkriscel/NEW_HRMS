import { connectDB } from './db'
import { fail } from './apiResponse'
import { ApiError } from './auth'
import { runRequestContext } from './tenantContext'
import { ensureTenantModelSchemasLoaded } from './tenantModels'

function skipsDbConnection(req) {
  if (process.env.NODE_ENV === 'production') return false
  const pathname = new URL(req.url).pathname
  return pathname === '/api/auth/dev-login'
}

// Wraps a Next.js route handler: opens the Mongo connection, and converts
// any thrown ApiError (or Mongoose validation error) into the standard
// error envelope instead of an unhandled 500.
export function withApi(handler) {
  return async (req, ctx) => {
    return runRequestContext(async () => {
      try {
        // Only the dev-login endpoint itself is backed by local dev data.
        // Real data APIs must still connect, even when the current user is a
        // dev-login super admin; otherwise Mongoose queries buffer for 10s.
        if (!skipsDbConnection(req)) {
          await connectDB()
          await ensureTenantModelSchemasLoaded()
        }
        return await handler(req, ctx)
      } catch (err) {
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
        if (err?.name === 'MongooseServerSelectionError') {
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
