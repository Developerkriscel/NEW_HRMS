export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import TenantProvisioningJob from '@/models/TenantProvisioningJob'
import TenantProvisioningStep from '@/models/TenantProvisioningStep'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')

  const job = await TenantProvisioningJob.findById(params.id).populate('tenant').populate('requestedBy', 'name email')
  if (!job) return fail('Provisioning job not found', 404)

  const steps = await TenantProvisioningStep.find({ job: job._id }).sort({ order: 1 })

  return ok({ job, steps })
})
