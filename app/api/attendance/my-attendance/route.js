export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'
import Tenant from '@/models/Tenant'
import Holiday from '@/models/Holiday'
import LeaveRequest from '@/models/LeaveRequest'
import LeaveType from '@/models/LeaveType'

// In-memory short-lived caches (60s) to eliminate redundant database round-trips
const tenantSettingsCache = global._nexahrTenantSettingsCache || new Map()
const employeeMetaCache = global._nexahrEmployeeMetaCache || new Map()
const leaveTypeCache = global._nexahrLeaveTypeCache || new Map()
global._nexahrTenantSettingsCache = tenantSettingsCache
global._nexahrEmployeeMetaCache = employeeMetaCache
global._nexahrLeaveTypeCache = leaveTypeCache

async function getCachedTenantSettings(tenantId) {
  const cached = tenantSettingsCache.get(String(tenantId))
  if (cached && cached.expiresAt > Date.now()) return cached.data
  const tenant = await Tenant.findById(tenantId)
    .select('timezone hrSettings.weeklyOff hrSettings.officeStartTime')
    .lean()
  const data = {
    timezone: tenant?.timezone || 'Asia/Kolkata',
    weeklyOff: Array.isArray(tenant?.hrSettings?.weeklyOff) ? tenant.hrSettings.weeklyOff : ['Sunday'],
    officeStartTime: tenant?.hrSettings?.officeStartTime || '09:00',
  }
  tenantSettingsCache.set(String(tenantId), { data, expiresAt: Date.now() + 60000 })
  return data
}

async function getCachedEmployeeMeta(userId) {
  const cached = employeeMetaCache.get(String(userId))
  if (cached && cached.expiresAt > Date.now()) return cached.data
  const employee = await Employee.findById(userId).select('joiningDate weekOff').lean()
  const data = {
    joiningDate: employee?.joiningDate || null,
    weekOff: employee?.weekOff || null,
  }
  employeeMetaCache.set(String(userId), { data, expiresAt: Date.now() + 60000 })
  return data
}

async function getCachedLeaveTypeMap(tenantId) {
  const cached = leaveTypeCache.get(String(tenantId))
  if (cached && cached.expiresAt > Date.now()) return cached.map
  const types = await LeaveType.find({ tenantId, deleted: false }).select('name').lean().catch(() => [])
  const map = new Map()
  for (const t of types) {
    map.set(String(t._id), t.name)
  }
  leaveTypeCache.set(String(tenantId), { map, expiresAt: Date.now() + 60000 })
  return map
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)

  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')
  const isCalendar = searchParams.get('calendar') === 'true'

  // Fetch tenant settings immediately (fast/cached)
  const tenantData = await getCachedTenantSettings(tenantId)
  const timezone = tenantData.timezone

  // Helper to extract calendar YYYY-MM-DD in tenant timezone
  function toDateKey(dateInput) {
    if (!dateInput) return null
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput
    }
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return null
    try {
      return d.toLocaleDateString('en-CA', { timeZone: timezone })
    } catch {
      return d.toISOString().split('T')[0]
    }
  }

  function formatTime12(dateInput) {
    if (!dateInput) return null
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return null
    try {
      return d.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).toLowerCase()
    } catch {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
    }
  }

  const now = new Date()
  const todayKey = toDateKey(now)
  const [currY, currM] = todayKey.split('-')

  let fromKey
  let toKey
  let queryYear = Number(yearParam || currY)
  let queryMonth = Number(monthParam || currM)

  if (monthParam && yearParam) {
    const daysInSelectedMonth = new Date(queryYear, queryMonth, 0).getDate()
    fromKey = `${queryYear}-${String(queryMonth).padStart(2, '0')}-01`
    toKey = `${queryYear}-${String(queryMonth).padStart(2, '0')}-${String(daysInSelectedMonth).padStart(2, '0')}`
  } else {
    fromKey = searchParams.get('from') ? toDateKey(searchParams.get('from')) : `${currY}-${currM}-01`
    toKey = searchParams.get('to') ? toDateKey(searchParams.get('to')) : todayKey
  }

  // Expand DB query window so no timezone edge cases miss records in MongoDB
  const [sy, sm, sd] = fromKey.split('-').map(Number)
  const queryFrom = new Date(Date.UTC(sy, sm - 1, sd - 1, 0, 0, 0))

  const [ey, em, ed] = toKey.split('-').map(Number)
  const queryTo = new Date(Date.UTC(ey, em - 1, ed + 2, 23, 59, 59, 999))

  // Run all remaining queries strictly in parallel with lean + minimal projection
  const [records, employee, holidays, approvedLeaves, leaveTypeMap] = await Promise.all([
    Attendance.find({
      employee: session.userId,
      tenantId,
      $or: [
        { date: { $gte: queryFrom, $lte: queryTo } },
        { checkInTime: { $gte: queryFrom, $lte: queryTo } },
      ],
    })
      .select('date checkInTime checkOutTime workingMinutes breakMinutes status lateMark earlyLogout halfDay breaks locationPolicyStatus checkInLocationName checkOutLocationName checkInDistanceMeters checkInAllowedRadiusMeters verificationStatus')
      .sort({ date: -1 })
      .lean(),
    getCachedEmployeeMeta(session.userId),
    Holiday.find({
      tenantId,
      deleted: false,
      date: { $gte: queryFrom, $lte: queryTo },
    })
      .select('name date')
      .lean()
      .catch(() => []),
    LeaveRequest.find({
      employee: session.userId,
      tenantId,
      status: 'APPROVED',
      deleted: false,
      startDate: { $lte: queryTo },
      endDate: { $gte: queryFrom },
    })
      .select('leaveType startDate endDate')
      .lean()
      .catch(() => []),
    getCachedLeaveTypeMap(tenantId),
  ])

  let weeklyOffs = []
  if (employee?.weekOff) {
    weeklyOffs = employee.weekOff.split(',').map((d) => d.trim().toLowerCase())
  } else if (tenantData?.weeklyOff && Array.isArray(tenantData.weeklyOff)) {
    weeklyOffs = tenantData.weeklyOff.map((d) => d.trim().toLowerCase())
  } else {
    weeklyOffs = ['sunday']
  }

  const holidayByDate = new Map()
  for (const h of holidays) {
    const hKey = toDateKey(h.date)
    if (hKey) holidayByDate.set(hKey, h.name || 'Holiday')
  }

  const leaveByDate = new Map()
  for (const l of approvedLeaves) {
    const startK = toDateKey(l.startDate)
    const endK = toDateKey(l.endDate)
    if (startK && endK) {
      const [ly, lm, ld] = startK.split('-').map(Number)
      const [ley, lem, led] = endK.split('-').map(Number)
      const c = new Date(Date.UTC(ly, lm - 1, ld))
      const end = new Date(Date.UTC(ley, lem - 1, led))
      const typeName = leaveTypeMap.get(String(l.leaveType)) || 'Leave'
      while (c <= end) {
        const k = `${c.getUTCFullYear()}-${String(c.getUTCMonth() + 1).padStart(2, '0')}-${String(c.getUTCDate()).padStart(2, '0')}`
        leaveByDate.set(k, typeName)
        c.setUTCDate(c.getUTCDate() + 1)
      }
    }
  }

  const joiningKey = employee?.joiningDate ? toDateKey(employee.joiningDate) : '2000-01-01'

  const recordsMap = new Map()
  records.forEach((r) => {
    const key = toDateKey(r.checkInTime) || toDateKey(r.date)
    if (key && key >= fromKey && key <= toKey) {
      recordsMap.set(key, r)
    }
  })

  // In calendar mode, iterate through all days of the month (1 to daysInMonth)
  const loopEndKey = isCalendar ? toKey : (toKey < todayKey ? toKey : todayKey)
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
    const [y, m, d] = dKey.split('-').map(Number)
    const dayDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    const dayOfWeek = dayDate.getUTCDay()
    const dayName = DAYS[dayOfWeek]
    const isFuture = dKey > todayKey
    const isToday = dKey === todayKey
    const isWeeklyOff = weeklyOffs.includes(dayName.toLowerCase())
    const isHoliday = holidayByDate.has(dKey)
    const holidayName = holidayByDate.get(dKey) || null
    const isLeave = leaveByDate.has(dKey)
    const leaveName = leaveByDate.get(dKey) || null

    if (recordsMap.has(dKey)) {
      const rec = recordsMap.get(dKey)
      const inTime = formatTime12(rec.checkInTime)
      const outTime = formatTime12(rec.checkOutTime)
      const isLate = !!rec.lateMark

      finalRecords.push({
        ...rec,
        _id: String(rec._id),
        date: rec.date || new Date(`${dKey}T12:00:00Z`).toISOString(),
        dateKey: dKey,
        dayNumber: d,
        dayName,
        dayOfWeek,
        isToday,
        isFuture: false,
        status: rec.status || 'PRESENT',
        badgeText: rec.status === 'HALF_DAY' ? 'HALF DAY' : (isLate ? 'LATE' : 'ON TIME'),
        punchIn: inTime,
        punchOut: outTime,
        holidayName,
        leaveName,
        isWeeklyOff,
      })
    } else {
      let status = 'ABSENT'
      let badgeText = 'ABSENT'

      if (dKey < joiningKey) {
        if (!isCalendar) continue
        status = 'NOT_JOINED'
        badgeText = 'NOT JOINED'
      } else if (isWeeklyOff) {
        status = 'WEEKEND'
        badgeText = 'WEEKLY OFF'
      } else if (isHoliday) {
        status = 'HOLIDAY'
        badgeText = 'HOLIDAY'
      } else if (isLeave) {
        status = 'ON_LEAVE'
        badgeText = 'LEAVE'
      } else if (isFuture) {
        status = 'UPCOMING'
        badgeText = ''
      } else if (isToday) {
        status = 'NOT_MARKED'
        badgeText = 'TODAY'
      }

      if (!isCalendar && (isWeeklyOff || isFuture)) {
        continue
      }

      finalRecords.push({
        _id: `${status.toLowerCase()}-${dKey}`,
        employee: session.userId,
        tenantId,
        date: dayDate.toISOString(),
        dateKey: dKey,
        dayNumber: d,
        dayName,
        dayOfWeek,
        isToday,
        isFuture,
        status,
        badgeText,
        punchIn: null,
        punchOut: null,
        holidayName,
        leaveName,
        isWeeklyOff,
        checkInTime: null,
        checkOutTime: null,
        workingMinutes: 0,
      })
    }
  }

  if (isCalendar) {
    const summary = {
      present: finalRecords.filter((r) => ['PRESENT', 'HALF_DAY', 'WFH'].includes(r.status) && r.punchIn).length,
      absent: finalRecords.filter((r) => r.status === 'ABSENT').length,
      halfDay: finalRecords.filter((r) => r.status === 'HALF_DAY').length,
      leaveOff: finalRecords.filter((r) => ['WEEKEND', 'HOLIDAY', 'ON_LEAVE'].includes(r.status)).length,
    }

    return ok({
      days: finalRecords,
      month: queryMonth,
      year: queryYear,
      weeklyOffs,
      timezone,
      summary,
    })
  }

  // Sort newest first for table view
  finalRecords.sort((a, b) => {
    const timeA = new Date(a.checkInTime || a.date).getTime()
    const timeB = new Date(b.checkInTime || b.date).getTime()
    return timeB - timeA
  })

  return ok(finalRecords)
})
