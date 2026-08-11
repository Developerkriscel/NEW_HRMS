export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { INTERVIEW_VIEW_ROLES } from '@/lib/interviewConstants'
import { checkAvailability } from '@/lib/interviewHelpers'

// GET ?employeeIds=a,b,c&date=&startTime=&endTime=&excludeInterviewId=
// Live conflict check while HR is still picking interviewers on the
// Schedule Interview form, before anything is actually saved.
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const employeeIds = (searchParams.get('employeeIds') || '').split(',').map((s) => s.trim()).filter(Boolean)
  const date = searchParams.get('date')
  const startTime = searchParams.get('startTime')
  const endTime = searchParams.get('endTime')
  const excludeInterviewId = searchParams.get('excludeInterviewId') || null

  if (!employeeIds.length || !date || !startTime || !endTime) return fail('employeeIds, date, startTime and endTime are required', 400, 'VALIDATION_ERROR')

  const availability = await checkAvailability(tenantId, employeeIds, date, startTime, endTime, excludeInterviewId)
  return ok(availability)
})
