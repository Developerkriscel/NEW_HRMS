export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Module from '@/models/Module'

const FIELDS = ['name', 'description', 'category', 'dependencies', 'status']

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'module.manage')

  const body = await req.json()
  const module_ = await Module.findOne({ _id: params.id, deleted: false })
  if (!module_) return fail('Module not found', 404)

  if (body.dependencies?.includes(module_.key)) {
    return fail('A module cannot depend on itself', 400, 'INVALID_DEPENDENCY')
  }

  for (const field of FIELDS) {
    if (body[field] !== undefined) module_[field] = body[field]
  }
  module_.updatedBy = session.sub
  await module_.save()

  await logSuperAdmin(session, {
    action: 'MODULE_UPDATED',
    entityType: 'Module',
    entityId: module_._id,
    description: `Module ${module_.key} updated`,
    req,
  })

  return ok(module_, 'Module updated')
})
