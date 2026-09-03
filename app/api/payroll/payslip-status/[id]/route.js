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
  'CANCELLED': ['DRAFT', 'REVIEW', 'APPROVED']
}

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['FINANCE', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  
  const { id } = params
  const body = await req.json().catch(() => ({}))
  const { status } = body
  
  if (!status) {
    return fail('Target status is required', 400)
  }

  if (!STATUS_TRANSITIONS[status]) {
    return fail('Invalid target status', 400)
  }

  const payslip = await Payslip.findOne({ _id: id, tenantId })
  if (!payslip) {
    return fail('Payslip not found', 404)
  }

  const allowedPreviousStatuses = STATUS_TRANSITIONS[status]
  if (!allowedPreviousStatuses.includes(payslip.status)) {
    return fail(`Cannot transition payslip from ${payslip.status} to ${status}`, 400)
  }

  payslip.status = status
  if (status === 'PAID') {
    payslip.paymentDate = new Date()
  }
  payslip.updatedBy = session.sub
  await payslip.save()

  await logAction(session, {
    action: `PAYSLIP_${status}`,
    entityType: 'Payslip',
    entityId: payslip._id,
    description: `Payslip status updated to ${status} for employee ${payslip.employee}`,
  })

  return ok(payslip, `Payslip moved to ${status}`)
})
