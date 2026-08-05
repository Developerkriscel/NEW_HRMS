import { connectDB } from './db'
import { fail } from './apiResponse'
import { ACCESS_COOKIE, ApiError, decodeJwt, verifyJwt } from './auth'
import { runRequestContext } from './tenantContext'
import { ensureTenantModelSchemasLoaded } from './tenantModels'
import { cookies } from 'next/headers'

function isDevLoginRequest() {
  if (process.env.NODE_ENV === 'production') return false
  const token = cookies().get(ACCESS_COOKIE)?.value
  if (!token) return false
  try {
    return !!verifyJwt(token)?.devLogin
  } catch {
    return !!decodeJwt(token)?.devLogin
  }
}

// Wraps a Next.js route handler: opens the Mongo connection, and converts
// any thrown ApiError (or Mongoose validation error) into the standard
// error envelope instead of an unhandled 500.
export function withApi(handler) {
  return async (req, ctx) => {
    return runRequestContext(async () => {
      try {
        // Dev login is meant to run fully DB-less so the app is usable with
        // no MongoDB configured at all. But when a real database *is*
        // configured, routes with no dev-store fallback (e.g. tenant
        // provisioning) would otherwise hang until Mongoose's
        // command-buffering timeout instead of just working — so connect
        // anyway whenever a URI is actually present.
        const hasRealDatabaseConfigured = !!(process.env.MONGODB_URI || process.env.MONGODB_DIRECT_URI)
        if (!isDevLoginRequest() || hasRealDatabaseConfigured) {
          await connectDB()
          ensureTenantModelSchemasLoaded()
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
