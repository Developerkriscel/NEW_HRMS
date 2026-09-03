export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole } from '@/lib/auth'
import AuditLog from '@/models/AuditLog'
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, 'SUPER_ADMIN')
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const tenantId = searchParams.get('tenantId')
  const action = searchParams.get('action')
  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    return ok(devSuperAdminStore.auditLogs({ page, size, tenantId, action }))
  }

  const query = {}
  if (tenantId) query.tenantId = tenantId
  if (action) query.action = action

  const totalElements = await AuditLog.countDocuments(query)
  const content = await AuditLog.find(query).sort({ createdAt: -1 }).skip(page * size).limit(size).lean()

  return ok(paged(content, page, size, totalElements))
})
