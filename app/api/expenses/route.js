export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Expense from '@/models/Expense'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const status = searchParams.get('status')

  const query = { tenantId }
  if (session.role === 'EMPLOYEE') {
    query.employee = session.userId
  } else if (session.role === 'MANAGER') {
    const reports = await Employee.find({ reportingManager: session.userId, tenantId, deleted: false }).select('_id')
    query.employee = { $in: reports.map((r) => r._id) }
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'FINANCE', 'SUPER_ADMIN'])
  }
  if (status) query.status = status

  const totalElements = await Expense.countDocuments(query)
  const content = await Expense.find(query)
    .populate('employee', 'firstName lastName employeeCode')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.amount || !body.expenseDate) return fail('amount and expenseDate are required', 400)

  const expense = await Expense.create({
    employee: session.userId,
    category: body.category || 'OTHER',
    amount: body.amount,
    description: body.description,
    expenseDate: body.expenseDate,
    receiptNote: body.receiptNote,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'EXPENSE_SUBMITTED',
    entityType: 'Expense',
    entityId: expense._id,
    description: `Expense claim of ${expense.amount} submitted`,
  })

  return ok(expense, 'Expense claim submitted', 201)
})
