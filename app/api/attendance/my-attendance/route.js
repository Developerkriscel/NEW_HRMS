export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'
import Tenant from '@/models/Tenant'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)

  const tenant = await Tenant.findById(tenantId).lean()
  const timezone = tenant?.timezone || 'Asia/Kolkata'

  // Helper to extract calendar YYYY-MM-DD in tenant timezone
  function toDateKey(dateInput) {
    if (!dateInput) return null
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return null
    try {
      return d.toLocaleDateString('en-CA', { timeZone: timezone })
    } catch {
      return d.toISOString().split('T')[0]
    }
  }

  const now = new Date()
  const todayKey = toDateKey(now)
  const [currY, currM] = todayKey.split('-')

  let fromKey = searchParams.get('from') ? toDateKey(searchParams.get('from')) : null
  if (!fromKey) {
    fromKey = `${currY}-${currM}-01`
  }

  let toKey = searchParams.get('to') ? toDateKey(searchParams.get('to')) : null
  if (!toKey) {
    toKey = todayKey
  }

  // Expand DB query window so no timezone edge cases miss records in MongoDB
  const [sy, sm, sd] = fromKey.split('-').map(Number)
  const queryFrom = new Date(Date.UTC(sy, sm - 1, sd - 1, 0, 0, 0))

  const [ey, em, ed] = toKey.split('-').map(Number)
  const queryTo = new Date(Date.UTC(ey, em - 1, ed + 2, 23, 59, 59, 999))

  const records = await Attendance.find({
    employee: session.userId,
    tenantId,
    $or: [
      { date: { $gte: queryFrom, $lte: queryTo } },
      { checkInTime: { $gte: queryFrom, $lte: queryTo } }
    ]
  }).sort({ date: -1 }).lean()

  const employee = await Employee.findById(session.userId).lean()

  let weeklyOffs = []
  if (employee?.weekOff) {
    weeklyOffs = employee.weekOff.split(',').map(d => d.trim().toLowerCase())
  } else if (tenant?.hrSettings?.weeklyOff) {
    weeklyOffs = tenant.hrSettings.weeklyOff.map(d => d.trim().toLowerCase())
  }

  const joiningKey = employee?.joiningDate ? toDateKey(employee.joiningDate) : '2000-01-01'

  const recordsMap = new Map()
  records.forEach(r => {
    // Prefer checkInTime for actual punch date; fallback to date
    const key = toDateKey(r.checkInTime) || toDateKey(r.date)
    if (key) {
      recordsMap.set(key, r)
    }
  })

  // The range of days to present in history
  const loopEndKey = toKey < todayKey ? toKey : todayKey
  const loopStartKey = fromKey <= loopEndKey ? fromKey : loopEndKey

  const dayKeys = []
  let [cy, cm, cd] = loopStartKey.split('-').map(Number)
  const [ty, tm, td] = loopEndKey.split('-').map(Number)
  const curUtc = new Date(Date.UTC(cy, cm - 1, cd))
  const endUtc = new Date(Date.UTC(ty, tm - 1, td))

  while (curUtc <= endUtc) {
    const y = curUtc.getUTCFullYear()
    const m = String(curUtc.getUTCMonth() + 1).padStart(2, '0')
    const d = String(curUtc.getUTCDate()).padStart(2, '0')
    dayKeys.push(`${y}-${m}-${d}`)
    curUtc.setUTCDate(curUtc.getUTCDate() + 1)
  }

  const finalRecords = []
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (const dKey of dayKeys) {
    if (recordsMap.has(dKey)) {
      const rec = recordsMap.get(dKey)
      finalRecords.push({
        ...rec,
        date: rec.date || new Date(`${dKey}T12:00:00Z`).toISOString()
      })
    } else {
      if (dKey < joiningKey) continue

      const [y, m, d] = dKey.split('-').map(Number)
      const dayDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
      const dayName = DAYS[dayDate.getUTCDay()]

      if (weeklyOffs.includes(dayName.toLowerCase())) continue

      // For today, if employee hasn't checked in yet, don't generate synthetic absent
      // while the working shift is still ongoing
      if (dKey === todayKey) {
        continue
      }

      finalRecords.push({
        _id: `absent-${dKey}`,
        employee: session.userId,
        tenantId,
        date: dayDate.toISOString(),
        status: 'ABSENT',
        checkInTime: null,
        checkOutTime: null,
        workingMinutes: 0
      })
    }
  }

  // Ensure any records in recordsMap that might fall slightly outside dayKeys are also included
  recordsMap.forEach((rec, key) => {
    if (!finalRecords.some(r => (toDateKey(r.checkInTime) || toDateKey(r.date)) === key)) {
      finalRecords.push({
        ...rec,
        date: rec.date || new Date(`${key}T12:00:00Z`).toISOString()
      })
    }
  })

  // Sort newest first
  finalRecords.sort((a, b) => {
    const timeA = new Date(a.checkInTime || a.date).getTime()
    const timeB = new Date(b.checkInTime || b.date).getTime()
    return timeB - timeA
  })

  return ok(finalRecords)
})
