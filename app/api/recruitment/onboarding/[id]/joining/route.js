export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_SENSITIVE_VIEW_ROLES } from '@/lib/preboardingConstants'
import { syncReadinessStatus } from '@/lib/candidateEmployeeConversionService'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_SENSITIVE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const preview = await syncReadinessStatus(tenantId, params.id)
  if (!preview) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  return ok(preview)
})
