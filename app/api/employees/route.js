export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, hashPassword } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sanitizeForManager } from '@/lib/employeeVisibility'
import { sanitizeModuleAccess } from '@/lib/moduleAccess'
import Employee from '@/models/Employee'
import Tenant from '@/models/Tenant'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)
  const sortBy = searchParams.get('sortBy') || 'firstName'
  const sortDir = searchParams.get('sortDir') === 'desc' ? -1 : 1
  const search = searchParams.get('search')
  const departmentId = searchParams.get('departmentId')
  const status = searchParams.get('status')
  const joinedAfter = searchParams.get('joinedAfter')

  const query = { tenantId, deleted: false }
  // A Manager only ever sees their own direct reports — never the whole company.
  if (session.role === 'MANAGER') query.reportingManager = session.userId
  // Search takes priority over the department filter, matching the original.
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeCode: { $regex: search, $options: 'i' } },
    ]
  } else if (departmentId) {
    query.department = departmentId
  }
  if (status) query.status = status
  if (joinedAfter) query.joiningDate = { $gte: new Date(joinedAfter) }

  const totalElements = await Employee.countDocuments(query)
  const content = await Employee.find(query)
    .select('-password')
    .populate('department', 'name')
    .populate('designation', 'name')
    .populate('reportingManager', 'firstName lastName')
    .sort({ [sortBy]: sortDir })
    .skip(page * size)
    .limit(size)

  const sanitized = content.map((e) => sanitizeForManager(e.toObject(), session.role))
  return ok(paged(sanitized, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.email || !body.firstName || !body.lastName) {
    return fail('firstName, lastName and email are required', 400)
  }
  if (body.moduleAccess?.length && !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('Only a Company Admin can assign HR module access', 403, 'FORBIDDEN')
  }

  const existing = await Employee.findOne({ email: body.email, tenantId, deleted: false })
  if (existing) return fail('An employee with this email already exists', 400, 'DUPLICATE')

  // Based on the highest existing code number, not a count of active
  // employees — employeeCode has a unique index across ALL employees
  // (deleted or not), so counting only active ones can regenerate a code
  // a soft-deleted employee still holds and collide with it.
  const allCodes = await Employee.find({ tenantId }).select('employeeCode')
  const maxCodeNumber = allCodes.reduce((max, e) => {
    const match = /(\d+)$/.exec(e.employeeCode || '')
    return match ? Math.max(max, parseInt(match[1], 10)) : max
  }, 0)
  const tenant = await Tenant.findById(tenantId).lean()
  const employeeIdPrefix = tenant?.hrSettings?.employeeIdPrefix || 'EMP'
  const employeeCode = `${employeeIdPrefix}${String(maxCodeNumber + 1).padStart(5, '0')}`
  const tempPassword = `Nexahr@${1000 + Math.floor(Math.random() * 9000)}`
  const hashedPassword = await hashPassword(tempPassword)

  const employee = await Employee.create({
    employeeCode,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    password: hashedPassword,
    phone: body.phone,
    role: body.role || 'EMPLOYEE',
    moduleAccess: ['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role) ? sanitizeModuleAccess(body.moduleAccess) : [],
    status: 'PROBATION', // new employees always start on probation, regardless of request body
    dateOfBirth: body.dateOfBirth || null,
    gender: body.gender,
    department: body.departmentId || null,
    designation: body.designationId || null,
    branch: body.branchId || null,
    reportingManager: body.reportingManagerId || null,
    joiningDate: body.joiningDate || null,
    workLocation: body.workLocation,
    employmentType: body.employmentType,
    ctc: body.ctc,
    basicSalary: body.basicSalary,
    address: body.address,
    city: body.city,
    state: body.state,
    country: body.country,
    pincode: body.pincode,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'EMPLOYEE_CREATED',
    entityType: 'Employee',
    entityId: employee._id,
    description: `Employee ${employee.getFullName()} (${employeeCode}) created`,
  })

  const responseEmployee = employee.toObject()
  delete responseEmployee.password

  // Temp password has no delivery channel yet (email sending was never
  // implemented in the original either) — returned once here so an admin
  // can hand it to the new hire out-of-band.
  return ok({ employee: responseEmployee, tempPassword }, 'Employee created', 201)
})
