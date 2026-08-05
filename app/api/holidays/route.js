export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Holiday from '@/models/Holiday'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))

  const query = { tenantId, deleted: false }
  if (year) {
    query.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59, 999) }
  }

  const holidays = await Holiday.find(query).sort({ date: 1 })
  return ok(holidays)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const holiday = await Holiday.create({
    name: body.name,
    date: body.date,
    recurringAnnually: body.recurringAnnually ?? false,
    optional: body.optional ?? false,
    tenantId,
    createdBy: session.sub,
  })

  return ok(holiday, 'Holiday created', 201)
})
