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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function dateKeyFor(dateInput, timezone) {
  if (!dateInput) return null
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return null
  try {
    return date.toLocaleDateString('en-CA', { timeZone: timezone })
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function compareDateKeys(a, b) {
  return String(a).localeCompare(String(b))
}

function minDateKey(...keys) {
  return keys.filter(Boolean).sort(compareDateKeys)[0]
}

function maxDateKey(...keys) {
  return keys.filter(Boolean).sort(compareDateKeys).at(-1)
}

function expandedWindow(fromKey, toKey) {
  const [sy, sm, sd] = fromKey.split('-').map(Number)
  const [ey, em, ed] = toKey.split('-').map(Number)
  return {
    from: new Date(Date.UTC(sy, sm - 1, sd - 1, 0, 0, 0)),
    to: new Date(Date.UTC(ey, em - 1, ed + 2, 23, 59, 59, 999)),
  }
}

function time12(dateInput, timezone) {
  if (!dateInput) return null
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return null
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase()
  } catch {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
  }
}

function dateKeysBetween(fromKey, toKey) {
  const keys = []
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  const cursor = new Date(Date.UTC(fy, fm - 1, fd))
  const end = new Date(Date.UTC(ty, tm - 1, td))

  while (cursor <= end) {
    keys.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return keys
}

function buildRecords({
  fromKey,
  toKey,
  todayKey,
  joiningKey,
  recordsMap,
  holidayByDate,
  leaveByDate,
  weeklyOffs,
  timezone,
  employeeId,
  tenantId,
}) {
  const effectiveFromKey = maxDateKey(fromKey, joiningKey)
  const effectiveToKey = compareDateKeys(toKey, todayKey) < 0 ? toKey : todayKey
  if (!effectiveFromKey || compareDateKeys(effectiveFromKey, effectiveToKey) > 0) return []

  const finalRecords = []
  for (const dKey of dateKeysBetween(effectiveFromKey, effectiveToKey)) {
    const [year, month, day] = dKey.split('-').map(Number)
    const dayDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    const dayOfWeek = dayDate.getUTCDay()
    const dayName = DAYS[dayOfWeek]
    const isToday = dKey === todayKey
    const isWeeklyOff = weeklyOffs.includes(dayName.toLowerCase())
    const holidayName = holidayByDate.get(dKey) || null
    const leaveName = leaveByDate.get(dKey) || null

    if (recordsMap.has(dKey)) {
      const rec = recordsMap.get(dKey)
      const isLate = !!rec.lateMark
      finalRecords.push({
        ...rec,
        _id: String(rec._id),
        date: rec.date || new Date(`${dKey}T12:00:00Z`).toISOString(),
        dateKey: dKey,
        dayNumber: day,
        dayName,
        dayOfWeek,
        isToday,
        isFuture: false,
        status: rec.status || 'PRESENT',
        badgeText: rec.status === 'HALF_DAY' ? 'HALF DAY' : (isLate ? 'LATE' : 'ON TIME'),
        punchIn: time12(rec.checkInTime, timezone),
        punchOut: time12(rec.checkOutTime, timezone),
        holidayName,
        leaveName,
        isWeeklyOff,
      })
      continue
    }

    if (isWeeklyOff) continue

    let status = 'ABSENT'
    let badgeText = 'ABSENT'
    if (holidayName) {
      status = 'HOLIDAY'
      badgeText = 'HOLIDAY'
    } else if (leaveName) {
      status = 'ON_LEAVE'
      badgeText = 'LEAVE'
    } else if (isToday) {
      status = 'NOT_MARKED'
      badgeText = 'TODAY'
    }

    finalRecords.push({
      _id: `${status.toLowerCase()}-${dKey}`,
      employee: employeeId,
      tenantId,
      date: dayDate.toISOString(),
      dateKey: dKey,
      dayNumber: day,
      dayName,
      dayOfWeek,
      isToday,
      isFuture: false,
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

  return finalRecords.sort((a, b) => new Date(b.checkInTime || b.date).getTime() - new Date(a.checkInTime || a.date).getTime())
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)

  const [tenant, employee] = await Promise.all([
    Tenant.findById(tenantId).select('timezone hrSettings.weeklyOff').lean(),
    Employee.findById(session.userId).select('joiningDate weekOff').lean(),
  ])

  const timezone = tenant?.timezone || 'Asia/Kolkata'
  const todayKey = dateKeyFor(new Date(), timezone)
  const [currentYear, currentMonth] = todayKey.split('-')
  const currentMonthStartKey = `${currentYear}-${currentMonth}-01`
  const joiningKey = employee?.joiningDate ? dateKeyFor(employee.joiningDate, timezone) : '2000-01-01'
  const requestedFromKey = dateKeyFor(searchParams.get('from'), timezone) || currentMonthStartKey
  const requestedToKey = dateKeyFor(searchParams.get('to'), timezone) || todayKey
  const fromKey = minDateKey(requestedFromKey, currentMonthStartKey, todayKey)
  const toKey = maxDateKey(requestedToKey, todayKey)
  const { from: queryFrom, to: queryTo } = expandedWindow(fromKey, toKey)

  const [records, holidays, approvedLeaves] = await Promise.all([
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
    Holiday.find({ tenantId, deleted: false, date: { $gte: queryFrom, $lte: queryTo } })
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
  ])

  const weeklyOffs = employee?.weekOff
    ? employee.weekOff.split(',').map((day) => day.trim().toLowerCase())
    : (tenant?.hrSettings?.weeklyOff || ['Sunday']).map((day) => day.trim().toLowerCase())

  const recordsMap = new Map()
  let todayRecord = null
  for (const record of records) {
    const key = dateKeyFor(record.checkInTime, timezone) || dateKeyFor(record.date, timezone)
    if (!key || compareDateKeys(key, fromKey) < 0 || compareDateKeys(key, toKey) > 0) continue
    recordsMap.set(key, record)
    if (key === todayKey) todayRecord = record
  }

  const holidayByDate = new Map()
  for (const holiday of holidays) {
    const key = dateKeyFor(holiday.date, timezone)
    if (key) holidayByDate.set(key, holiday.name || 'Holiday')
  }

  const leaveTypeIds = [...new Set(approvedLeaves.map((leave) => String(leave.leaveType)).filter(Boolean))]
  const leaveTypes = leaveTypeIds.length
    ? await LeaveType.find({ tenantId, deleted: false, _id: { $in: leaveTypeIds } }).select('name').lean().catch(() => [])
    : []
  const leaveTypeMap = new Map(leaveTypes.map((type) => [String(type._id), type.name]))
  const leaveByDate = new Map()
  for (const leave of approvedLeaves) {
    const startKey = dateKeyFor(leave.startDate, timezone)
    const endKey = dateKeyFor(leave.endDate, timezone)
    if (!startKey || !endKey) continue
    const typeName = leaveTypeMap.get(String(leave.leaveType)) || 'Leave'
    for (const key of dateKeysBetween(startKey, endKey)) {
      leaveByDate.set(key, typeName)
    }
  }

  const buildArgs = {
    todayKey,
    joiningKey,
    recordsMap,
    holidayByDate,
    leaveByDate,
    weeklyOffs,
    timezone,
    employeeId: session.userId,
    tenantId,
  }

  return ok({
    todayRecord,
    records: buildRecords({ ...buildArgs, fromKey: requestedFromKey, toKey: requestedToKey }),
    monthRecords: buildRecords({ ...buildArgs, fromKey: currentMonthStartKey, toKey: todayKey }),
  })
})
