export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Department from '@/models/Department'

function isObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
}

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const department = await Department.findOne({ _id: params.id, tenantId, deleted: false })
  if (!department) return fail('Department not found', 404)

  if (body.name != null) {
    if (!body.name?.trim()) return fail('Department name is required', 400)
    department.name = body.name.trim()
  }
  if (body.description != null) department.description = body.description?.trim() || ''
  if (body.code != null) {
    const code = body.code?.trim()?.toUpperCase() || ''
    if (code && !/^[A-Z0-9-_]+$/.test(code)) {
      return fail('Department code can use only letters, numbers, hyphen, and underscore', 400)
    }
    department.code = code
  }
  if (body.head !== undefined) department.head = isObjectId(body.head) ? body.head : null
  if (body.active != null) department.active = body.active
  department.updatedBy = session.sub
  await department.save()

  return ok(department, 'Department updated')
})

export const DELETE = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const department = await Department.findOne({ _id: params.id, tenantId, deleted: false })
  if (!department) return fail('Department not found', 404)

  department.deleted = true
  department.updatedBy = session.sub
  await department.save()

  return ok(null, 'Department deleted')
})
