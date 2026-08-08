export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { JOB_VIEW_ROLES } from '@/lib/jobConstants'
import { INTEGRATION_PROVIDER_LIST } from '@/lib/publishingConstants'
import RecruitmentIntegration from '@/models/RecruitmentIntegration'

// Any HR/Admin can see connection status (needed to render the Publish
// modal's Connected/Not Connected state) — only Company Admin can actually
// connect/disconnect one, enforced in the provider-scoped routes.
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  // Every provider always has a row, even a fresh tenant that's never
  // touched Settings — upsert the missing ones as NOT_CONNECTED rather
  // than making the UI cope with "no row yet" as a third state.
  const existing = await RecruitmentIntegration.find({ tenantId, deleted: false })
  const existingProviders = new Set(existing.map((i) => i.provider))
  const missing = INTEGRATION_PROVIDER_LIST.filter((p) => !existingProviders.has(p))
  if (missing.length) {
    await RecruitmentIntegration.insertMany(missing.map((provider) => ({ tenantId, provider, status: 'NOT_CONNECTED' })))
  }

  const integrations = await RecruitmentIntegration.find({ tenantId, deleted: false })
    .populate('connectedBy', 'firstName lastName')
    .sort({ provider: 1 })

  return ok(integrations)
})
