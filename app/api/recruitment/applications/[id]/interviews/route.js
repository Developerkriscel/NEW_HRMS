export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { INTERVIEW_VIEW_ROLES } from '@/lib/interviewConstants'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'

// GET — every interview round scheduled for this application, for the
// Application Detail page's Interviews section.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const interviews = await Interview.find({ tenantId, applicationId: params.id, deleted: false }).sort({ date: -1 })
  const panel = await InterviewPanelMember.find({ tenantId, interviewId: { $in: interviews.map((i) => i._id) } }).lean()
  const panelByInterview = new Map()
  for (const p of panel) {
    const key = String(p.interviewId)
    if (!panelByInterview.has(key)) panelByInterview.set(key, [])
    panelByInterview.get(key).push(p)
  }

  return ok(interviews.map((i) => ({ ...i.toObject(), panel: panelByInterview.get(String(i._id)) || [] })))
})
