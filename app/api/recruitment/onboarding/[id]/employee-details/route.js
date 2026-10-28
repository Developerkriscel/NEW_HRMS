export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_SENSITIVE_VIEW_ROLES, canManagePreboarding, FORM_STATUS } from '@/lib/preboardingConstants'
import { recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import Preboarding from '@/models/Preboarding'
import PreboardingPersonalDetails from '@/models/PreboardingPersonalDetails'
import PreboardingEmergencyContact from '@/models/PreboardingEmergencyContact'
import PreboardingBankDetails from '@/models/PreboardingBankDetails'
import PreboardingStatutoryDetails from '@/models/PreboardingStatutoryDetails'
import PreboardingEmploymentHistory from '@/models/PreboardingEmploymentHistory'
import PreboardingEducation from '@/models/PreboardingEducation'
import Employee from '@/models/Employee'

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== ''

function compactPatch(source, keys) {
  return keys.reduce((patch, key) => {
    if (source[key] !== undefined) patch[key] = source[key] === '' ? null : source[key]
    return patch
  }, {})
}

function employeeDetailsComplete(personal, emergencyContact) {
  return [
    personal.fullLegalName,
    personal.dateOfBirth,
    personal.personalEmail,
    personal.mobileNumber,
    personal.currentAddress,
    emergencyContact.contactName,
    emergencyContact.relationship,
    emergencyContact.phone,
  ].every(hasValue)
}

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_SENSITIVE_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  if (!canManagePreboarding(session)) return fail('You do not have permission to update employee onboarding details', 403, 'FORBIDDEN')

  const body = await req.json()
  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  const employeeCode = String(body.employeeCode || '').trim().toUpperCase()
  if (preboarding.convertedEmployeeId && employeeCode !== String(preboarding.employeeCode || '').toUpperCase()) {
    return fail('This employee has already been created. Update the Employee ID from the employee profile instead.', 409, 'EMPLOYEE_ALREADY_CONVERTED')
  }
  if (employeeCode) {
    const [existingEmployee, existingPreboarding] = await Promise.all([
      Employee.findOne({ tenantId, employeeCode, deleted: false, _id: { $ne: preboarding.convertedEmployeeId || null } }).select('_id').lean(),
      Preboarding.findOne({ tenantId, employeeCode, _id: { $ne: preboarding._id }, deleted: false }).select('_id').lean(),
    ])
    if (existingEmployee || existingPreboarding) return fail('This Employee ID is already in use. Choose a unique ID.', 409, 'EMPLOYEE_ID_IN_USE')
    preboarding.employeeCode = employeeCode
  } else if (!preboarding.convertedEmployeeId) {
    preboarding.employeeCode = null
  }

  const fullLegalName = [body.firstName, body.lastName].filter(Boolean).join(' ').trim()
  const personalPatch = compactPatch({
    fullLegalName: fullLegalName || body.fullLegalName,
    preferredName: body.preferredName,
    personalEmail: body.personalEmail || body.officialEmail,
    mobileNumber: body.phone || body.mobileNumber,
    dateOfBirth: body.dateOfBirth,
    currentAddress: body.currentAddress,
    permanentAddress: body.permanentAddress,
    declarationAccurate: body.declarationAccurate,
    declarationWillNotify: body.declarationWillNotify,
  }, ['fullLegalName', 'preferredName', 'personalEmail', 'mobileNumber', 'dateOfBirth', 'currentAddress', 'permanentAddress', 'declarationAccurate', 'declarationWillNotify'])

  const emergencyPatch = compactPatch({
    contactName: body.emergencyPersonName,
    relationship: body.emergencyRelationship || 'Emergency Contact',
    phone: body.emergencyContactNumber,
    alternatePhone: body.emergencyAlternatePhone,
  }, ['contactName', 'relationship', 'phone', 'alternatePhone'])

  const bankPatch = compactPatch(body, ['accountHolderName', 'bankName', 'bankAccountNumber', 'bankIfscCode', 'bankBranch'])
  const customFields = compactPatch({
    officialEmail: body.officialEmail,
    officialPhoneNumber: body.officialPhoneNumber,
    fatherName: body.fatherName,
    motherName: body.motherName,
    spouseName: body.spouseName,
    bloodGroup: body.bloodGroup,
    gender: body.gender,
    maritalStatus: body.maritalStatus,
    anniversaryDate: body.anniversaryDate,
    aadhaarNumber: body.aadhaarNumber,
    pfNumber: body.pfNumber,
    esiNumber: body.esiNumber,
    previousPfMember: body.previousPfMember,
  }, ['officialEmail', 'officialPhoneNumber', 'fatherName', 'motherName', 'spouseName', 'bloodGroup', 'gender', 'maritalStatus', 'anniversaryDate', 'aadhaarNumber', 'pfNumber', 'esiNumber'])
  const statutoryPatch = compactPatch(body, ['panNumber', 'uanNumber', 'previousPfMember'])

  const [personal, emergencyContact, bank, statutory] = await Promise.all([
    PreboardingPersonalDetails.findOneAndUpdate(
      { tenantId, preboardingId: preboarding._id },
      { $set: personalPatch },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    PreboardingEmergencyContact.findOneAndUpdate(
      { tenantId, preboardingId: preboarding._id },
      { $set: emergencyPatch },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    PreboardingBankDetails.findOneAndUpdate(
      { tenantId, preboardingId: preboarding._id },
      { $set: bankPatch },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    PreboardingStatutoryDetails.findOneAndUpdate(
      { tenantId, preboardingId: preboarding._id },
      { $set: { ...statutoryPatch, customFields } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
  ])

  if (Array.isArray(body.employmentHistory)) {
    await PreboardingEmploymentHistory.deleteMany({ tenantId, preboardingId: preboarding._id })
    const rows = body.employmentHistory.filter((row) => row?.employerName).map((row, order) => ({
      tenantId, preboardingId: preboarding._id, order,
      employerName: row.employerName, designation: row.designation, startDate: row.startDate || null,
      endDate: row.endDate || null, employeeId: row.employeeId, reasonForLeaving: row.reasonForLeaving,
    }))
    if (rows.length) await PreboardingEmploymentHistory.insertMany(rows)
  }
  if (Array.isArray(body.education)) {
    await PreboardingEducation.deleteMany({ tenantId, preboardingId: preboarding._id })
    const rows = body.education.filter((row) => row?.degree).map((row, order) => ({
      tenantId, preboardingId: preboarding._id, order,
      degree: row.degree, specialization: row.specialization, institution: row.institution,
      university: row.university, startYear: row.startYear || null, completionYear: row.completionYear || null, score: row.score,
    }))
    if (rows.length) await PreboardingEducation.insertMany(rows)
  }

  const joiningPatch = compactPatch(body, ['availableToJoin', 'relocationRequired', 'accommodationRequired', 'requestedJoiningDate', 'requestedJoiningReason'])
  if (Object.keys(joiningPatch).length) Object.assign(preboarding, joiningPatch)

  if (employeeDetailsComplete(personal, emergencyContact)) {
    preboarding.formStatus = FORM_STATUS.APPROVED
    preboarding.formApprovedAt = preboarding.formApprovedAt || new Date()
  } else if ([FORM_STATUS.NOT_SENT, FORM_STATUS.SENT, FORM_STATUS.OPENED].includes(preboarding.formStatus)) {
    preboarding.formStatus = FORM_STATUS.IN_PROGRESS
  }

  preboarding.activityLog.push({
    type: 'EMPLOYEE_DETAILS_UPDATED',
    message: employeeDetailsComplete(personal, emergencyContact)
      ? 'Employee details completed and approved'
      : 'Employee details saved as draft',
    actorName: session.name || session.sub,
  })
  await recomputePreboardingStatus(tenantId, preboarding)
  await preboarding.save()

  return ok({ personal, emergencyContact, bank, statutory, preboarding }, 'Employee details saved')
})
