export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Designation from '@/models/Designation'

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const designations = await Designation.find({ tenantId, deleted: false }).populate('department', 'name').sort({ name: 1 })
  return ok(designations)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const designation = await Designation.create({
    name: body.name,
    code: body.code,
    grade: body.grade,
    department: body.department || null,
    active: body.active ?? true,
    tenantId,
    createdBy: session.sub,
  })

  return ok(designation, 'Designation created', 201)
})
