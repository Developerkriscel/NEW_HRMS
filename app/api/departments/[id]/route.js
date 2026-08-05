export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Department from '@/models/Department'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const department = await Department.findOne({ _id: params.id, tenantId, deleted: false })
  if (!department) return fail('Department not found', 404)

  if (body.name != null) department.name = body.name
  if (body.description != null) department.description = body.description
  if (body.code != null) department.code = body.code
  if (body.head != null) department.head = body.head
  if (body.active != null) department.active = body.active
  department.updatedBy = session.sub
  await department.save()

  return ok(department, 'Department updated')
})

export const DELETE = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const department = await Department.findOne({ _id: params.id, tenantId, deleted: false })
  if (!department) return fail('Department not found', 404)

  department.deleted = true
  department.updatedBy = session.sub
  await department.save()

  return ok(null, 'Department deleted')
})
