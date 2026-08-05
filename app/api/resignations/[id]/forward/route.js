export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Resignation from '@/models/Resignation'

export const PUT = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const resignation = await Resignation.findOne({ _id: params.id, tenantId }).populate('employee', 'reportingManager')
  if (!resignation) return fail('Resignation not found', 404)

  if (session.role === 'MANAGER' && String(resignation.employee.reportingManager) !== session.userId) {
    return fail('You can only forward resignations for your own direct reports', 403)
  }
  if (!['SUBMITTED', 'MANAGER_REVIEWED'].includes(resignation.status)) {
    return fail('Only a submitted or manager-reviewed resignation can be forwarded', 400)
  }

  resignation.status = 'FORWARDED_TO_HR'
  resignation.updatedBy = session.sub
  await resignation.save()

  await logAction(session, {
    action: 'RESIGNATION_FORWARDED',
    entityType: 'Resignation',
    entityId: resignation._id,
    description: 'Resignation forwarded to HR',
  })

  return ok(resignation, 'Resignation forwarded to HR')
})
