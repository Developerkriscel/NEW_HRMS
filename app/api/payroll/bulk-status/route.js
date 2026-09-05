export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Payslip from '@/models/Payslip'

const STATUS_TRANSITIONS = {
  'REVIEW': ['DRAFT', 'PROCESSING'],
  'APPROVED': ['REVIEW'],
  'FINALIZED': ['APPROVED'],
  'PAID': ['FINALIZED'],
  'CANCELLED': ['DRAFT', 'REVIEW', 'APPROVED'] // Can't cancel finalized/paid easily here
}

export const PATCH = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['FINANCE', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  
  const body = await req.json().catch(() => ({}))
  const { month, year, status } = body
  
  if (!month || !year || !status) {
    return fail('Month, year, and target status are required', 400)
  }

  if (!STATUS_TRANSITIONS[status]) {
    return fail('Invalid target status', 400)
  }

  const allowedPreviousStatuses = STATUS_TRANSITIONS[status]
  const update = { status, updatedBy: session.sub }
  if (status === 'PAID') {
    update.paymentDate = new Date()
  }

  const result = await Payslip.updateMany(
    { tenantId, month, year, deleted: false, status: { $in: allowedPreviousStatuses } },
    { $set: update }
  )

  await logAction(session, {
    action: `PAYROLL_${status}`,
    entityType: 'Payslip',
    description: `Payroll bulk status updated to ${status} for ${month}/${year}. Affected records: ${result.modifiedCount}`,
  })

  return ok({ updatedCount: result.modifiedCount }, `Successfully moved ${result.modifiedCount} records to ${status}`)
})
