export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Holiday from '@/models/Holiday'

function parseHolidayDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const holiday = await Holiday.findOne({ _id: params.id, tenantId, deleted: false })
  if (!holiday) return fail('Holiday not found', 404)

  if (body.name != null) {
    if (!body.name?.trim()) return fail('Holiday name is required', 400)
    holiday.name = body.name.trim()
  }
  if (body.date != null) {
    const date = parseHolidayDate(body.date)
    if (!date) return fail('Holiday date is required', 400)
    holiday.date = date
  }
  if (body.recurringAnnually != null) holiday.recurringAnnually = body.recurringAnnually
  if (body.optional != null) holiday.optional = body.optional
  holiday.updatedBy = session.sub
  await holiday.save()

  return ok(holiday, 'Holiday updated')
})

export const DELETE = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const holiday = await Holiday.findOne({ _id: params.id, tenantId, deleted: false })
  if (!holiday) return fail('Holiday not found', 404)

  holiday.deleted = true
  holiday.updatedBy = session.sub
  await holiday.save()

  return ok(null, 'Holiday deleted')
})
