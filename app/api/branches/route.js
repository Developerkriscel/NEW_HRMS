export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Branch from '@/models/Branch'

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const branches = await Branch.find({ tenantId, deleted: false }).sort({ name: 1 })
  return ok(branches)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const branch = await Branch.create({
    name: body.name,
    address: body.address,
    city: body.city,
    state: body.state,
    country: body.country,
    phone: body.phone,
    headOffice: body.headOffice ?? false,
    latitude: body.latitude,
    longitude: body.longitude,
    geoFenceRadius: body.geoFenceRadius ?? 100,
    active: body.active ?? true,
    tenantId,
    createdBy: session.sub,
  })

  return ok(branch, 'Branch created', 201)
})
