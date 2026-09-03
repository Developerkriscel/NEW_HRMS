export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Branch from '@/models/Branch'

function normalizeNumber(value, fallback = null) {
  if (value === '' || value == null) return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function validateCoordinates(body) {
  const latitude = normalizeNumber(body.latitude)
  const longitude = normalizeNumber(body.longitude)
  if (body.latitude !== undefined && body.latitude !== '' && body.latitude != null && latitude == null) return 'Latitude must be a valid number'
  if (body.longitude !== undefined && body.longitude !== '' && body.longitude != null && longitude == null) return 'Longitude must be a valid number'
  if (latitude != null && (latitude < -90 || latitude > 90)) return 'Latitude must be between -90 and 90'
  if (longitude != null && (longitude < -180 || longitude > 180)) return 'Longitude must be between -180 and 180'
  return ''
}

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const branch = await Branch.findOne({ _id: params.id, tenantId, deleted: false })
  if (!branch) return fail('Branch not found', 404)

  const coordinateError = validateCoordinates(body)
  if (coordinateError) return fail(coordinateError, 400)

  if (body.name !== undefined) {
    if (!body.name?.trim()) return fail('Branch name is required', 400)
    branch.name = body.name.trim()
  }
  if (body.address !== undefined) branch.address = body.address?.trim() || ''
  if (body.city !== undefined) {
    if (!body.city?.trim()) return fail('City is required', 400)
    branch.city = body.city.trim()
  }
  if (body.state !== undefined) {
    if (!body.state?.trim()) return fail('State is required', 400)
    branch.state = body.state.trim()
  }
  if (body.country !== undefined) {
    if (!body.country?.trim()) return fail('Country is required', 400)
    branch.country = body.country.trim()
  }
  if (body.phone !== undefined) branch.phone = body.phone?.trim() || ''
  if (body.headOffice !== undefined) branch.headOffice = !!body.headOffice
  if (body.active !== undefined) branch.active = !!body.active
  if (body.latitude !== undefined) branch.latitude = normalizeNumber(body.latitude)
  if (body.longitude !== undefined) branch.longitude = normalizeNumber(body.longitude)
  if (body.geoFenceRadius !== undefined) {
    const radius = normalizeNumber(body.geoFenceRadius, 100)
    branch.geoFenceRadius = radius && radius > 0 ? radius : 100
  }

  branch.updatedBy = session.sub
  if (branch.headOffice) {
    await Branch.updateMany({ _id: { $ne: branch._id }, tenantId, deleted: false, headOffice: true }, { $set: { headOffice: false, updatedBy: session.sub } })
  }
  await branch.save()

  return ok(branch, 'Branch updated')
})

export const DELETE = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const branch = await Branch.findOne({ _id: params.id, tenantId, deleted: false })
  if (!branch) return fail('Branch not found', 404)

  branch.deleted = true
  branch.updatedBy = session.sub
  await branch.save()

  return ok(null, 'Branch deleted')
})
