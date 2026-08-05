export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Module from '@/models/Module'

export const GET = withApi(async () => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'module.view')

  const modules = await Module.find({ deleted: false }).sort({ category: 1, name: 1 })
  return ok(modules)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'module.manage')

  const body = await req.json()
  if (!body.key || !body.name) return fail('key and name are required', 400)

  const existing = await Module.findOne({ key: body.key })
  if (existing) return fail('A module with this key already exists', 400, 'DUPLICATE')

  const missingDeps = (body.dependencies || []).length
    ? (await Module.find({ key: { $in: body.dependencies }, deleted: false })).length !== body.dependencies.length
    : false
  if (missingDeps) return fail('One or more dependency module keys do not exist', 400, 'INVALID_DEPENDENCY')

  const module_ = await Module.create({
    key: body.key,
    name: body.name,
    description: body.description,
    category: body.category,
    dependencies: body.dependencies || [],
    createdBy: session.sub,
  })

  await logSuperAdmin(session, {
    action: 'MODULE_CREATED',
    entityType: 'Module',
    entityId: module_._id,
    description: `Module ${module_.key} added to the catalogue`,
    req,
  })

  return ok(module_, 'Module created', 201)
})
