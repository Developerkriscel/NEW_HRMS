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

  const fullLegalName = [body.firstName, body.lastName].filter(Boolean).join(' ').trim()
  const personalPatch = compactPatch({
    fullLegalName: fullLegalName || body.fullLegalName,
    personalEmail: body.personalEmail || body.officialEmail,
    mobileNumber: body.phone || body.mobileNumber,
    dateOfBirth: body.dateOfBirth,
    currentAddress: body.currentAddress,
    permanentAddress: body.permanentAddress,
  }, ['fullLegalName', 'personalEmail', 'mobileNumber', 'dateOfBirth', 'currentAddress', 'permanentAddress'])

  const emergencyPatch = compactPatch({
    contactName: body.emergencyPersonName,
    relationship: body.emergencyRelationship || 'Emergency Contact',
    phone: body.emergencyContactNumber,
  }, ['contactName', 'relationship', 'phone'])

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
  }, ['officialEmail', 'officialPhoneNumber', 'fatherName', 'motherName', 'spouseName', 'bloodGroup', 'gender', 'maritalStatus', 'anniversaryDate', 'aadhaarNumber', 'pfNumber', 'esiNumber'])
  const statutoryPatch = compactPatch(body, ['panNumber', 'uanNumber'])

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
