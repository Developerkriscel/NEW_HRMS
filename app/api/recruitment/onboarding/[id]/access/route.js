export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { hashPassword, requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { PREBOARDING_SENSITIVE_VIEW_ROLES, canManagePreboarding } from '@/lib/preboardingConstants'
import Employee from '@/models/Employee'
import Preboarding from '@/models/Preboarding'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_SENSITIVE_VIEW_ROLES)
  if (!canManagePreboarding(session)) return fail('You do not have permission to set employee access', 403, 'FORBIDDEN')

  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))
  const loginEmail = String(body.loginEmail || '').trim().toLowerCase()
  const initialPassword = String(body.initialPassword || '')
  if (!loginEmail || !/^\S+@\S+\.\S+$/.test(loginEmail)) return fail('A valid login email is required', 400)
  if (initialPassword.length < 8) return fail('Initial password must be at least 8 characters', 400)

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) return fail('Preboarding profile not found', 404)
  const existing = await Employee.findOne({ tenantId, deleted: false, email: loginEmail }).select('_id').lean()
  if (existing) return fail('Login email is already used by an employee', 409, 'DUPLICATE_EMPLOYEE')

  preboarding.employeeLoginEmail = loginEmail
  preboarding.employeePasswordHash = await hashPassword(initialPassword)
  preboarding.employeePasswordConfiguredAt = new Date()
  preboarding.activityLog.push({
    type: 'ACCESS_SETUP',
    message: 'Employee login access configured',
    actorName: session.name || session.sub,
  })
  await preboarding.save()

  return ok({ email: loginEmail, configuredAt: preboarding.employeePasswordConfiguredAt }, 'Login access saved')
})
