export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Plan from '@/models/Plan'
import Module from '@/models/Module'
import PlanModule from '@/models/PlanModule'

const AVAILABILITY = new Set(['INCLUDED', 'ADD_ON', 'UNAVAILABLE'])

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'plan.view')

  const mappings = await PlanModule.find({ plan: params.id }).populate('module')
  return ok(mappings)
})

// Body: { mappings: [{ moduleId, availability }] } — full replace, since a
// plan's module map is small and this avoids partial-update ambiguity.
export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'plan.update')

  const plan = await Plan.findOne({ _id: params.id, deleted: false })
  if (!plan) return fail('Plan not found', 404)

  const body = await req.json()
  const mappings = Array.isArray(body.mappings) ? body.mappings : []

  for (const m of mappings) {
    if (!AVAILABILITY.has(m.availability)) return fail(`Invalid availability: ${m.availability}`, 400)
  }
  const moduleIds = mappings.map((m) => m.moduleId)
  const modules = await Module.find({ _id: { $in: moduleIds }, deleted: false })
  if (modules.length !== moduleIds.length) return fail('One or more modules do not exist', 400, 'INVALID_MODULE')

  await PlanModule.deleteMany({ plan: plan._id })
  for (const m of mappings) {
    await PlanModule.create({ plan: plan._id, module: m.moduleId, availability: m.availability, createdBy: session.sub })
  }

  await logSuperAdmin(session, {
    action: 'PLAN_MODULES_UPDATED',
    entityType: 'Plan',
    entityId: plan._id,
    description: `Module map updated for plan ${plan.name}`,
    req,
  })

  const updated = await PlanModule.find({ plan: plan._id }).populate('module')
  return ok(updated, 'Plan modules updated')
})
