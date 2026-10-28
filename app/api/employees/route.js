export const dynamic = 'force-dynamic'

import mongoose from 'mongoose'
import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, hashPassword, validatePasswordStrength } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sanitizeForManager } from '@/lib/employeeVisibility'
import { sanitizeModuleAccess } from '@/lib/moduleAccess'
import { sendEmployeeInvitationEmail } from '@/lib/mail'
import { rememberLoginDirectoryEntry } from '@/lib/loginDirectory'
import Employee from '@/models/Employee'
import Tenant from '@/models/Tenant'
import '@/models/Department'
import '@/models/Designation'

const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'SUPER_ADMIN'])

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)
  const sortBy = searchParams.get('sortBy') || 'firstName'
  const sortDir = searchParams.get('sortDir') === 'desc' ? -1 : 1
  const search = searchParams.get('search')
  const departmentId = searchParams.get('departmentId')
  const status = searchParams.get('status')
  const joinedAfter = searchParams.get('joinedAfter')
  const group = searchParams.get('group')

  if (session.role === 'SUPER_ADMIN' && !session.tenantId) {
    return ok(paged([], page, size, 0))
  }

  const tenantId = requireTenantId(session)
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
  if (group === 'hr') query.role = 'HR_MANAGER'
  if (group === 'managers') query.role = 'MANAGER'
  if (group === 'employees') {
    query.role = 'EMPLOYEE'
    query.employmentType = { $not: /intern/i }
  }
  if (group === 'interns') query.employmentType = /intern/i

  const baseCountQuery = { tenantId, deleted: false }
  if (session.role === 'MANAGER') baseCountQuery.reportingManager = session.userId

  // Keep all directory counts in one database round trip. Aggregation does
  // not cast ObjectIds automatically, unlike countDocuments/find.
  const aggregateTenantId = mongoose.Types.ObjectId.isValid(String(tenantId))
    ? new mongoose.Types.ObjectId(String(tenantId))
    : tenantId
  const aggregateQuery = { ...query, tenantId: aggregateTenantId }
  const aggregateBaseQuery = { ...baseCountQuery, tenantId: aggregateTenantId }

  const [countResult, content] = await Promise.all([
    Employee.aggregate([
      {
        $facet: {
          total: [{ $match: aggregateQuery }, { $count: 'value' }],
          all: [{ $match: aggregateBaseQuery }, { $count: 'value' }],
          hr: [{ $match: { ...aggregateBaseQuery, role: 'HR_MANAGER' } }, { $count: 'value' }],
          managers: [{ $match: { ...aggregateBaseQuery, role: 'MANAGER' } }, { $count: 'value' }],
          employees: [{ $match: { ...aggregateBaseQuery, role: 'EMPLOYEE', employmentType: { $not: /intern/i } } }, { $count: 'value' }],
          interns: [{ $match: { ...aggregateBaseQuery, employmentType: /intern/i } }, { $count: 'value' }],
        },
      },
    ]),
    Employee.find(query)
      .select('-password')
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('reportingManager', 'firstName lastName')
      .sort({ [sortBy]: sortDir })
      .skip(page * size)
      .limit(size)
      .lean(),
  ])

  const counts = countResult[0] || {}
  const countValue = (key) => counts[key]?.[0]?.value || 0
  const totalElements = countValue('total')
  const groupCounts = [
    countValue('all'),
    countValue('hr'),
    countValue('managers'),
    countValue('employees'),
    countValue('interns'),
  ]

  const sanitized = content.map((e) => sanitizeForManager(e, session.role))
  const response = paged(sanitized, page, size, totalElements)
  response.groupCounts = {
    all: groupCounts[0],
    hr: groupCounts[1],
    managers: groupCounts[2],
    employees: groupCounts[3],
    interns: groupCounts[4],
  }
  return ok(response)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.email || !body.firstName || !body.lastName) {
    return fail('firstName, lastName and email are required', 400)
  }
  if (body.gender && !VALID_GENDERS.includes(body.gender)) return fail('Invalid gender', 400)
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
  const requestedEmployeeCode = String(body.employeeCode || '').trim().toUpperCase()
  if (requestedEmployeeCode && !/^[A-Z0-9][A-Z0-9_-]{2,30}$/.test(requestedEmployeeCode)) return fail('Employee ID must be 3–31 characters and use only letters, numbers, hyphens, or underscores', 400, 'INVALID_EMPLOYEE_ID')
  if (requestedEmployeeCode && await Employee.exists({ tenantId, employeeCode: requestedEmployeeCode })) return fail('This Employee ID is already in use', 409, 'EMPLOYEE_ID_IN_USE')
  const employeeCode = requestedEmployeeCode || `${employeeIdPrefix}${String(maxCodeNumber + 1).padStart(5, '0')}`
  const requestedPassword = typeof body.password === 'string' ? body.password : ''
  if (requestedPassword) {
    const passwordCheck = validatePasswordStrength(requestedPassword)
    if (!passwordCheck.valid) return fail(passwordCheck.message, 400, 'WEAK_PASSWORD')
  }
  const tempPassword = requestedPassword || `Nexahr@${1000 + Math.floor(Math.random() * 9000)}`
  const hashedPassword = await hashPassword(tempPassword)

  const employee = await Employee.create({
    employeeCode,
    firstName: body.firstName,
    lastName: body.lastName,
    preferredName: body.preferredName || null,
    email: body.email,
    password: hashedPassword,
    phone: body.phone,
    alternatePhone: body.alternatePhone || null,
    role: body.role || 'EMPLOYEE',
    moduleAccess: ['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role) ? sanitizeModuleAccess(body.moduleAccess) : [],
    status: 'PROBATION', // new employees always start on probation, regardless of request body
    dateOfBirth: body.dateOfBirth || null,
    maritalStatus: body.maritalStatus || null,
    anniversaryDate: body.anniversaryDate || null,
    bloodGroup: body.bloodGroup || null,
    fatherName: body.fatherName || null,
    motherName: body.motherName || null,
    spouseName: body.spouseName || null,
    gender: body.gender || undefined,
    department: body.departmentId || null,
    designation: body.designationId || null,
    branch: body.branchId || null,
    reportingManager: body.reportingManagerId || null,
    joiningDate: body.joiningDate || null,
    workLocation: body.workLocation,
    officialPhoneNumber: body.officialPhoneNumber || null,
    employmentType: body.employmentType,
    ctc: body.ctc,
    basicSalary: body.basicSalary,
    address: body.address,
    city: body.city,
    state: body.state,
    country: body.country,
    pincode: body.pincode,
    personalEmail: body.personalEmail || null,
    officialEmail: body.officialEmail || null,
    emergencyContactNumber: body.emergencyContactNumber || null,
    emergencyPersonName: body.emergencyPersonName || null,
    emergencyRelationship: body.emergencyRelationship || null,
    previousEmployment: Array.isArray(body.previousEmployment) ? body.previousEmployment : [],
    education: Array.isArray(body.education) ? body.education : [],
    joiningPreferences: body.joiningPreferences || {},
    declarations: body.declarations || {},
    bankName: body.bankName || null,
    bankAccountNumber: body.bankAccountNumber || null,
    bankIfscCode: body.bankIfscCode || null,
    accountHolderName: body.accountHolderName || null,
    bankBranch: body.bankBranch || null,
    panNumber: body.panNumber || null,
    aadhaarNumber: body.aadhaarNumber || null,
    pfNumber: body.pfNumber || null,
    uanNumber: body.uanNumber || null,
    esiNumber: body.esiNumber || null,
    tenantId,
    createdBy: session.sub,
  })
  await rememberLoginDirectoryEntry({ isSuperAdmin: false, doc: employee, tenant, databaseName: tenant?.databaseName || null })

  await logAction(session, {
    action: 'EMPLOYEE_CREATED',
    entityType: 'Employee',
    entityId: employee._id,
    description: `Employee ${employee.getFullName()} (${employeeCode}) created`,
  })

  const responseEmployee = employee.toObject()
  delete responseEmployee.password
  const invitation = await sendEmployeeInvitationEmail({
    employee,
    password: tempPassword,
    companyName: tenant?.companyName,
    tenantId,
  })

  // Temp password has no delivery channel yet (email sending was never
  // implemented in the original either) — returned once here so an admin
  // can hand it to the new hire out-of-band.
  return ok({ employee: responseEmployee, tempPassword, invitation }, 'Employee created', 201)
})
