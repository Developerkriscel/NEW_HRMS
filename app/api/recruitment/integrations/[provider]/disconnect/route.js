export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES } from '@/lib/jobConstants'
import { INTEGRATION_PROVIDER_LIST, canManageIntegrations } from '@/lib/publishingConstants'
import RecruitmentIntegration from '@/models/RecruitmentIntegration'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const provider = params.provider?.toUpperCase()
  if (!INTEGRATION_PROVIDER_LIST.includes(provider)) {
    return fail(`Unknown provider "${params.provider}"`, 400, 'VALIDATION_ERROR')
  }
  if (!canManageIntegrations(session)) {
    return fail('Only a Company Admin can disconnect recruitment integrations', 403, 'FORBIDDEN')
  }

  const integration = await RecruitmentIntegration.findOneAndUpdate(
    { tenantId, provider },
    { status: 'NOT_CONNECTED', configuration: {}, updatedBy: session.sub },
    { upsert: true, new: true }
  )

  await logAction(session, {
    action: 'RECRUITMENT_INTEGRATION_DISCONNECTED',
    entityType: 'RecruitmentIntegration',
    entityId: integration._id,
    description: `${provider} disconnected from recruitment publishing`,
    req,
  })

  return ok(integration, `${provider} disconnected`)
})
