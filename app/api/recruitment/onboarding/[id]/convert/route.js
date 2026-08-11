export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_SENSITIVE_VIEW_ROLES, canManagePreboarding } from '@/lib/preboardingConstants'
import {
  convertCandidateToEmployee,
  syncReadinessStatus,
} from '@/lib/candidateEmployeeConversionService'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_SENSITIVE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const preview = await syncReadinessStatus(tenantId, params.id)
  if (!preview) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  return ok(preview)
})

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_SENSITIVE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManagePreboarding(session)) {
    return fail('You do not have permission to create an employee from this candidate', 403, 'FORBIDDEN')
  }

  const body = await req.json().catch(() => ({}))
  try {
    const result = await convertCandidateToEmployee(tenantId, params.id, session, {
      overrideDuplicate: !!body.overrideDuplicate,
    })

    await logAction(session, {
      action: result.alreadyCompleted ? 'EMPLOYEE_CONVERSION_REPLAYED' : 'EMPLOYEE_CONVERSION_COMPLETED',
      entityType: 'Preboarding',
      entityId: params.id,
      description: result.alreadyCompleted
        ? 'Employee conversion returned existing completed employee'
        : `Candidate converted into employee ${result.employee?.employeeCode}`,
      req,
    })

    return ok(result, result.alreadyCompleted ? 'Employee already created' : 'Employee created successfully', result.alreadyCompleted ? 200 : 201)
  } catch (err) {
    if (err.errorCode === 'DUPLICATE_EMPLOYEE') {
      return fail(err.message, 409, err.errorCode, { duplicates: err.duplicates })
    }
    if (err.errorCode === 'NOT_READY') {
      return fail(err.message, 400, err.errorCode, { missingRequired: err.details })
    }
    throw err
  }
})
