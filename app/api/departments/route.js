export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Department from '@/models/Department'

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const departments = await Department.find({ tenantId, deleted: false }).populate('head', 'firstName lastName').sort({ name: 1 })
  return ok(departments)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const department = await Department.create({
    name: body.name,
    code: body.code,
    description: body.description,
    head: body.head || null,
    active: body.active ?? true,
    tenantId,
    createdBy: session.sub,
  })

  return ok(department, 'Department created', 201)
})
