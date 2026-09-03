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

function validateBranch(body) {
  if (!body.name?.trim()) return 'Branch name is required'
  if (!body.city?.trim()) return 'City is required'
  if (!body.state?.trim()) return 'State is required'
  if (!body.country?.trim()) return 'Country is required'

  const latitude = normalizeNumber(body.latitude)
  const longitude = normalizeNumber(body.longitude)
  if (body.latitude !== '' && body.latitude != null && latitude == null) return 'Latitude must be a valid number'
  if (body.longitude !== '' && body.longitude != null && longitude == null) return 'Longitude must be a valid number'
  if (latitude != null && (latitude < -90 || latitude > 90)) return 'Latitude must be between -90 and 90'
  if (longitude != null && (longitude < -180 || longitude > 180)) return 'Longitude must be between -180 and 180'

  const geoFenceRadius = normalizeNumber(body.geoFenceRadius, 100)
  if (!geoFenceRadius || geoFenceRadius < 1) return 'Geo fence radius must be at least 1 meter'
  return ''
}

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const branches = await Branch.find({ tenantId, deleted: false }).sort({ name: 1 })
  return ok(branches)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const validationError = validateBranch(body)
  if (validationError) return fail(validationError, 400)

  const latitude = normalizeNumber(body.latitude)
  const longitude = normalizeNumber(body.longitude)
  const geoFenceRadius = normalizeNumber(body.geoFenceRadius, 100)

  if (body.headOffice) {
    await Branch.updateMany({ tenantId, deleted: false, headOffice: true }, { $set: { headOffice: false, updatedBy: session.sub } })
  }

  const branch = await Branch.create({
    name: body.name.trim(),
    address: body.address?.trim() || '',
    city: body.city?.trim() || '',
    state: body.state?.trim() || '',
    country: body.country?.trim() || '',
    phone: body.phone?.trim() || '',
    headOffice: body.headOffice ?? false,
    latitude,
    longitude,
    geoFenceRadius,
    active: body.active ?? true,
    tenantId,
    createdBy: session.sub,
  })

  return ok(branch, 'Branch created', 201)
})
