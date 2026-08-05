export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Expense from '@/models/Expense'
import Employee from '@/models/Employee'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'FINANCE', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const expense = await Expense.findOne({ _id: params.id, tenantId })
  if (!expense) return fail('Expense claim not found', 404)
  if (expense.status !== 'PENDING') return fail('Only pending claims can be sent back', 400)

  if (session.role === 'MANAGER') {
    const employee = await Employee.findOne({ _id: expense.employee, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      return fail('You can only send back claims from your own direct reports', 403)
    }
  }

  expense.status = 'SENT_BACK'
  expense.reviewedBy = session.userId
  expense.managerRemarks = body.remarks
  expense.updatedBy = session.sub
  await expense.save()

  await logAction(session, {
    action: 'EXPENSE_SENT_BACK',
    entityType: 'Expense',
    entityId: expense._id,
    description: `Expense claim of ${expense.amount} sent back for correction`,
  })

  return ok(expense, 'Expense sent back')
})
