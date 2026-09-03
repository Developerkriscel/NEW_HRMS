export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'

function startOfToday() {
  return new Date(new Date().toDateString())
}

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))
  
  const { action } = body // 'start' or 'end'

  if (!['start', 'end'].includes(action)) {
    return fail('Invalid action', 400)
  }

  const today = startOfToday()
  const now = new Date()

  const attendance = await Attendance.findOne({ employee: session.userId, date: today, tenantId })
  
  if (!attendance || !attendance.checkInTime) {
    return fail('No check-in found for today', 400)
  }
  
  if (attendance.checkOutTime) {
    return fail('Cannot start/end break after checking out', 400)
  }

  // Ensure breaks array exists
  if (!attendance.breaks) {
    attendance.breaks = []
  }

  if (action === 'start') {
    // Check if there is already an active break
    const activeBreak = attendance.breaks.find(b => !b.end)
    if (activeBreak) {
      return fail('You are already on a break', 400)
    }
    
    attendance.breaks.push({
      start: now,
      duration: 0
    })
  } else if (action === 'end') {
    // Find active break
    const activeBreakIndex = attendance.breaks.findIndex(b => !b.end)
    if (activeBreakIndex === -1) {
      return fail('You are not currently on a break', 400)
    }
    
    const activeBreak = attendance.breaks[activeBreakIndex]
    activeBreak.end = now
    activeBreak.duration = Math.round((now.getTime() - activeBreak.start.getTime()) / 60000)
  }

  attendance.updatedBy = session.sub
  await attendance.save()

  return ok({
    id: attendance._id,
    breaks: attendance.breaks,
    message: action === 'start' ? 'Break started' : 'Break ended'
  })
})
