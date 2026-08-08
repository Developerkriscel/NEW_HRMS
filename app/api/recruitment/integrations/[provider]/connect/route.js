export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES } from '@/lib/jobConstants'
import { INTEGRATION_PROVIDER_LIST, canManageIntegrations } from '@/lib/publishingConstants'
import RecruitmentIntegration from '@/models/RecruitmentIntegration'

// Mock connect — Step 4 ships no real LinkedIn/Naukri/Indeed/Foundit API
// access, so this simulates what a real OAuth/API-key handshake would
// eventually flip: status -> CONNECTED with a small non-secret config blob.
// See models/RecruitmentIntegration.js for why no secret field exists here.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const provider = params.provider?.toUpperCase()
  if (!INTEGRATION_PROVIDER_LIST.includes(provider)) {
    return fail(`Unknown provider "${params.provider}"`, 400, 'VALIDATION_ERROR')
  }
  if (!canManageIntegrations(session)) {
    return fail('Only a Company Admin can connect recruitment integrations', 403, 'FORBIDDEN')
  }

  const body = await req.json().catch(() => ({}))

  const integration = await RecruitmentIntegration.findOneAndUpdate(
    { tenantId, provider },
    {
      tenantId, provider,
      status: 'CONNECTED',
      configuration: body.configuration || { mock: true },
      connectedBy: session.userId,
      connectedAt: new Date(),
      updatedBy: session.sub,
    },
    { upsert: true, new: true }
  )

  await logAction(session, {
    action: 'RECRUITMENT_INTEGRATION_CONNECTED',
    entityType: 'RecruitmentIntegration',
    entityId: integration._id,
    description: `${provider} connected for recruitment publishing`,
    req,
  })

  return ok(integration, `${provider} connected`)
})
