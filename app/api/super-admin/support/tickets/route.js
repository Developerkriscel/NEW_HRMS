export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import SupportTicket from '@/models/SupportTicket'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.view')

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const assignedTo = searchParams.get('assignedTo')
  const unassigned = searchParams.get('unassigned') === 'true'

  let query = {}

  if (status) query.status = status
  if (priority) query.priority = priority
  
  if (unassigned) {
    query.assignedTo = null
  } else if (assignedTo) {
    query.assignedTo = assignedTo
  }

  const tickets = await SupportTicket.find(query)
    .populate('tenant', 'name subdomain')
    .populate('createdBy', 'firstName lastName email')
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 })
    .lean()

  return ok(tickets)
})
