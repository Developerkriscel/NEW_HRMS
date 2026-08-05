export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole } from '@/lib/auth'
import AuditLog from '@/models/AuditLog'

// AuditLog is tenant-scoped (proxied per active tenant database, same as
// Employee) — requireAuth() already applied this session's tenant context,
// so a plain, unfiltered query here naturally returns only this company's
// own history, never another tenant's.
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN'])
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const action = searchParams.get('action')

  const query = {}
  if (action) query.action = action

  const totalElements = await AuditLog.countDocuments(query)
  const content = await AuditLog.find(query).sort({ createdAt: -1 }).skip(page * size).limit(size)

  return ok(paged(content, page, size, totalElements))
})
