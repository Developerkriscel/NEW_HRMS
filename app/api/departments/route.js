export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Department from '@/models/Department'

function isObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
}

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const departments = await Department.find({ tenantId, deleted: false }).populate('head', 'firstName lastName email employeeCode').sort({ name: 1 })
  return ok(departments)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.name?.trim()) return fail('Department name is required', 400)
  const code = body.code?.trim()?.toUpperCase() || ''
  if (code && !/^[A-Z0-9-_]+$/.test(code)) {
    return fail('Department code can use only letters, numbers, hyphen, and underscore', 400)
  }

  const department = await Department.create({
    name: body.name.trim(),
    code,
    description: body.description?.trim() || '',
    head: isObjectId(body.head) ? body.head : null,
    active: body.active ?? true,
    tenantId,
    createdBy: session.sub,
  })

  return ok(department, 'Department created', 201)
})
