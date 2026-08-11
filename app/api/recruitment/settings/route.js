export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, canManageCandidates } from '@/lib/candidateConstants'
import { SELECTION_APPROVAL_LEVEL_LIST } from '@/lib/selectionConstants'
import { COMPENSATION_APPROVAL_LEVEL_LIST } from '@/lib/compensationConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { getRecruitmentSettings } from '@/lib/selectionHelpers'

// GET/PATCH — the one recruitment_settings row per tenant that holds the
// configurable Step 11/12 approval workflows. "Do not hard-code one
// workflow for every tenant" — this is the screen that lets each tenant
// pick its own.
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const settings = await getRecruitmentSettings(tenantId)
  return ok(settings)
})

export const PATCH = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageCandidates(session)) return fail('You do not have permission to change recruitment settings', 403, 'FORBIDDEN')
  if (body.selectionApprovalLevel && !SELECTION_APPROVAL_LEVEL_LIST.includes(body.selectionApprovalLevel)) {
    return fail('Invalid selection approval level', 400, 'VALIDATION_ERROR')
  }
  if (body.compensationApprovalLevel && !COMPENSATION_APPROVAL_LEVEL_LIST.includes(body.compensationApprovalLevel)) {
    return fail('Invalid compensation approval level', 400, 'VALIDATION_ERROR')
  }

  const settings = await getRecruitmentSettings(tenantId)
  if (body.selectionApprovalLevel) settings.selectionApprovalLevel = body.selectionApprovalLevel
  if (body.compensationApprovalLevel) settings.compensationApprovalLevel = body.compensationApprovalLevel
  settings.updatedByName = await getActorName(session)
  await settings.save()

  await logAction(session, { action: 'RECRUITMENT_SETTINGS_UPDATED', entityType: 'RecruitmentSettings', entityId: settings._id, description: 'Recruitment approval settings updated', req })

  return ok(settings, 'Settings updated')
})
