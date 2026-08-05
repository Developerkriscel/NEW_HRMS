export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Announcement from '@/models/Announcement'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') || 20)

  const query = { tenantId, $or: [{ scope: 'COMPANY' }] }
  if (session.role === 'MANAGER') {
    query.$or.push({ scope: 'TEAM', team: session.userId })
  } else if (session.role === 'EMPLOYEE') {
    // Team announcements from this employee's manager only.
    const Employee = (await import('@/models/Employee')).default
    const me = await Employee.findById(session.userId).select('reportingManager')
    if (me?.reportingManager) query.$or.push({ scope: 'TEAM', team: me.reportingManager })
  }

  const announcements = await Announcement.find(query)
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)

  return ok(announcements)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()
  if (!body.title || !body.body) return fail('title and body are required', 400)

  // A Manager can only ever post to their own team, regardless of what the client sends.
  const scope = session.role === 'MANAGER' ? 'TEAM' : body.scope || 'COMPANY'

  const announcement = await Announcement.create({
    title: body.title,
    body: body.body,
    scope,
    createdBy: session.userId,
    team: scope === 'TEAM' ? session.userId : null,
    tenantId,
  })

  await logAction(session, {
    action: 'ANNOUNCEMENT_CREATED',
    entityType: 'Announcement',
    entityId: announcement._id,
    description: `Announcement "${announcement.title}" created`,
  })

  return ok(announcement, 'Announcement posted', 201)
})
