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

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')) : defaultFrom
  let to = searchParams.get('to') ? new Date(searchParams.get('to')) : now
  
  if (searchParams.get('to')) {
    const toDate = new Date(searchParams.get('to'))
    toDate.setDate(toDate.getDate() + 1)
    to = toDate
  } else {
    to = now
  }

  const records = await Attendance.find({
    employee: session.userId,
    tenantId,
    date: { $gte: from, $lt: to },
  }).sort({ date: -1 }).lean()

  const employee = await Employee.findById(session.userId).lean()
  const tenant = await Tenant.findById(tenantId).lean()

  let weeklyOffs = []
  if (employee?.weekOff) {
    weeklyOffs = employee.weekOff.split(',').map(d => d.trim())
  } else if (tenant?.hrSettings?.weeklyOff) {
    weeklyOffs = tenant.hrSettings.weeklyOff
  }

  const joiningDate = employee?.joiningDate ? new Date(employee.joiningDate) : new Date(2000, 0, 1)

  const recordsMap = new Map()
  records.forEach(r => {
    recordsMap.set(new Date(r.date).toISOString().split('T')[0], r)
  })

  const endLimit = new Date()
  endLimit.setHours(23, 59, 59, 999)
  
  const actualTo = to < endLimit ? to : endLimit
  const loopEnd = new Date(actualTo)

  const finalRecords = []
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (let d = new Date(from); d < loopEnd; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split('T')[0]
    if (recordsMap.has(dStr)) {
      finalRecords.push(recordsMap.get(dStr))
    } else {
      // Check joining date
      const dTime = d.getTime()
      const joiningTime = joiningDate.getTime()
      if (dTime < joiningTime && dStr !== joiningDate.toISOString().split('T')[0]) {
        continue
      }
      
      const dayName = DAYS[d.getDay()]
      if (!weeklyOffs.includes(dayName)) {
        finalRecords.push({
          _id: `absent-${dStr}`,
          employee: session.userId,
          tenantId,
          date: new Date(d).toISOString(),
          status: 'ABSENT',
          checkInTime: null,
          checkOutTime: null,
          workingMinutes: 0
        })
      }
    }
  }

  finalRecords.sort((a, b) => new Date(b.date) - new Date(a.date))

  return ok(finalRecords)
})
