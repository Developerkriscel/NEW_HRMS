import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { hasModuleAccess, moduleForApiPath, moduleForHrPath } from './lib/moduleAccess'

// Runs on the Edge runtime, so it can only verify the JWT signature/expiry
// (via `jose`, not `jsonwebtoken`/Node crypto) and read claims already
// embedded in the token — it cannot query MongoDB for the logout blacklist.
// That check happens per-request in API routes via lib/auth.js#getSession.
// This middleware exists purely to replace the old client-side
// `ProtectedRoute` component with a fast, pre-render redirect.

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore'
)

const ROLE_DASHBOARDS = {
  SUPER_ADMIN: '/super-admin/dashboard',
  COMPANY_ADMIN: '/company/dashboard',
  HR_MANAGER: '/hr/dashboard',
  MANAGER: '/manager/dashboard',
  EMPLOYEE: '/employee/dashboard',
  FINANCE: '/hr/dashboard',
  IT_ADMIN: '/hr/dashboard',
}

const ROLE_GUARDS = [
  { prefix: '/super-admin', roles: ['SUPER_ADMIN'] },
  { prefix: '/company', roles: ['COMPANY_ADMIN'] },
  // Company Admin also reaches these pages directly (via the Company Admin
  // sidebar's Attendance/Leave/Payroll/Reports links, which point at the
  // shared /hr/* pages rather than duplicating them under /company) — the
  // underlying API routes already allow COMPANY_ADMIN via requireRole, this
  // just keeps the page-level guard consistent with that.
  { prefix: '/hr', roles: ['HR_MANAGER', 'FINANCE', 'IT_ADMIN', 'COMPANY_ADMIN'] },
  { prefix: '/manager', roles: ['MANAGER'] },
  { prefix: '/employee', roles: ['EMPLOYEE'] },
]

function apiAuthError(message, status, errorCode) {
  return NextResponse.json(
    {
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      errorCode,
    },
    { status }
  )
}

async function readSession(req) {
  const token = req.cookies.get('nexahr_token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.type !== 'access') return null
    return payload
  } catch {
    return null
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl
  const session = await readSession(req)

  if (pathname.startsWith('/api')) {
    const moduleKey = moduleForApiPath(pathname)
    if (moduleKey) {
      if (!session) {
        return apiAuthError('Authentication required', 401, 'UNAUTHENTICATED')
      }
      if (!hasModuleAccess(session, moduleKey)) {
        return apiAuthError('You do not have access to this module', 403, 'MODULE_FORBIDDEN')
      }
    }
  }

  const isAuthPage = pathname === '/login' || pathname === '/forgot-password'

  if (pathname === '/') {
    const dest = session ? ROLE_DASHBOARDS[session.role] || '/login' : '/login'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  if (isAuthPage) {
    if (session) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[session.role] || '/login', req.url))
    }
    return NextResponse.next()
  }

  const guard = ROLE_GUARDS.find((g) => pathname.startsWith(g.prefix))
  if (guard) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (!guard.roles.includes(session.role)) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[session.role] || '/login', req.url))
    }
    if (pathname.startsWith('/hr')) {
      const moduleKey = moduleForHrPath(pathname)
      if (moduleKey && !hasModuleAccess(session, moduleKey)) {
        return NextResponse.redirect(new URL(ROLE_DASHBOARDS[session.role] || '/login', req.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/forgot-password',
    '/super-admin/:path*',
    '/company/:path*',
    '/hr/:path*',
    '/manager/:path*',
    '/employee/:path*',
    '/api/:path*',
  ],
}
