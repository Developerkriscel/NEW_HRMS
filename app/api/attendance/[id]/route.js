export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  
  const { id } = params
  if (!id) return fail('Attendance ID is required', 400, 'BAD_REQUEST')

  const body = await req.json()
  const { checkInTime, checkOutTime, status, date } = body

  let record = await Attendance.findOne({ _id: id, tenantId })
  
  if (!record) {
    // If not found by attendance ID, it might be an employee ID (for dummy 'ABSENT' records)
    const emp = await Employee.findOne({ _id: id, tenantId }).lean()
    if (emp && date) {
      // Find if an attendance record actually exists for this date to avoid duplicates
      const d = new Date(date)
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const end = new Date(start)
      end.setDate(start.getDate() + 1)
      
      record = await Attendance.findOne({ employee: id, date: { $gte: start, $lt: end }, tenantId })
      
      if (!record) {
        // Create a new record
        record = new Attendance({
          tenantId,
          employee: id,
          date: start,
        })
      }
    } else {
      return fail('Attendance record not found', 404, 'NOT_FOUND')
    }
  }

  if (checkInTime !== undefined) record.checkInTime = checkInTime ? new Date(checkInTime) : null
  if (checkOutTime !== undefined) record.checkOutTime = checkOutTime ? new Date(checkOutTime) : null
  if (status) record.status = status

  await record.save()

  return ok(record)
})
