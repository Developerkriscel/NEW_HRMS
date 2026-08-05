export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sanitizeForManager } from '@/lib/employeeVisibility'
import Employee, { EMPLOYEE_ROLES } from '@/models/Employee'
import Permission from '@/models/Permission'

const UPDATABLE_FIELDS = [
  'firstName', 'lastName', 'phone', 'alternatePhone', 'dateOfBirth', 'gender',
  'maritalStatus', 'bloodGroup', 'nationality', 'religion', 'address', 'city',
  'state', 'country', 'pincode', 'status', 'workLocation', 'employmentType',
  'ctc', 'basicSalary', 'bankName', 'bankAccountNumber', 'bankIfscCode',
  'accountHolderName', 'bankBranch', 'aadhaarNumber', 'panNumber', 'pfNumber',
  'uanNumber', 'esiNumber', 'confirmationDate', 'resignationDate', 'lastWorkingDate',
]

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const employee = await Employee.findOne({ _id: params.id, tenantId, deleted: false })
    .select('-password')
    .populate('department', 'name')
    .populate('designation', 'name')
    .populate('branch', 'name')
    .populate('shift', 'name startTime endTime')
    .populate('reportingManager', 'firstName lastName')

  if (!employee) return fail('Employee not found', 404)

  if (session.role === 'MANAGER' && String(employee.reportingManager) !== String(session.userId)) {
    return fail('You can only view your own direct reports', 403)
  }

  // .populate('permissions') is unreliable in this app's multi-tenant setup
  // (Permission is force-registered as tenant-scoped despite having no
  // tenantId field — see models/_base.js) — fetch and attach separately.
  let responseEmployee = employee.toObject()
  if (employee.permissions?.length) {
    responseEmployee.permissions = await Permission.find({ _id: { $in: employee.permissions } })
  }
  responseEmployee = sanitizeForManager(responseEmployee, session.role)
  return ok(responseEmployee)
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const employee = await Employee.findOne({ _id: params.id, tenantId, deleted: false })
  if (!employee) return fail('Employee not found', 404)

  for (const field of UPDATABLE_FIELDS) {
    if (body[field] !== undefined && body[field] !== null) employee[field] = body[field]
  }
  if (body.departmentId !== undefined) employee.department = body.departmentId || null
  if (body.designationId !== undefined) employee.designation = body.designationId || null
  if (body.branchId !== undefined) employee.branch = body.branchId || null
  if (body.reportingManagerId !== undefined) employee.reportingManager = body.reportingManagerId || null
  if (body.shiftId !== undefined) employee.shift = body.shiftId || null

  if (body.role !== undefined && body.role !== employee.role) {
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return fail('Only a Company Admin can change an employee\'s role', 403)
    }
    if (!EMPLOYEE_ROLES.includes(body.role)) return fail('Invalid role', 400)
    if (employee.role === 'COMPANY_ADMIN') {
      // "Still functioning" is broader than ACTIVE alone — PROBATION and
      // NOTICE_PERIOD employees are still working and can still administer
      // the account; only the genuinely departed/disabled statuses shouldn't count.
      const remainingAdmins = await Employee.countDocuments({
        tenantId, role: 'COMPANY_ADMIN', deleted: false, _id: { $ne: employee._id },
        status: { $nin: ['INACTIVE', 'RESIGNED', 'TERMINATED', 'ABSCONDED', 'RETIRED'] },
      })
      if (remainingAdmins < 1) {
        return fail('This would leave the company with no active admin — promote another employee to Company Admin first', 400)
      }
    }
    employee.role = body.role
  }

  employee.updatedBy = session.sub
  await employee.save()

  await logAction(session, {
    action: 'EMPLOYEE_UPDATED',
    entityType: 'Employee',
    entityId: employee._id,
    description: `Employee ${employee.getFullName()} updated`,
  })

  const responseEmployee = employee.toObject()
  delete responseEmployee.password
  return ok(responseEmployee, 'Employee updated')
})

export const DELETE = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const employee = await Employee.findOne({ _id: params.id, tenantId, deleted: false })
  if (!employee) return fail('Employee not found', 404)

  employee.deleted = true
  employee.status = 'INACTIVE'
  employee.updatedBy = session.sub
  await employee.save()

  await logAction(session, {
    action: 'EMPLOYEE_DELETED',
    entityType: 'Employee',
    entityId: employee._id,
    description: `Employee ${employee.getFullName()} deleted`,
  })

  return ok(null, 'Employee deleted')
})
