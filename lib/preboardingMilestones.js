import { FORM_STATUS, VERIFICATION_STATUS } from './preboardingConstants'

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== ''

export function isEmployeeDetailsComplete(preboarding = {}) {
  const personal = preboarding.personal || {}
  const emergency = preboarding.emergencyContact || {}
  return [
    personal.fullLegalName,
    personal.dateOfBirth,
    personal.personalEmail,
    personal.mobileNumber,
    personal.currentAddress,
    emergency.contactName,
    emergency.relationship,
    emergency.phone,
  ].every(hasValue) || preboarding.formStatus === FORM_STATUS.APPROVED
}

export function areDocumentsComplete(preboarding = {}) {
  const documents = Array.isArray(preboarding.documents) ? preboarding.documents : []
  const requiredDocs = documents.filter((doc) => doc.isRequired !== false && doc.required !== false)
  if (!requiredDocs.length) return preboarding.verificationStatus === VERIFICATION_STATUS.COMPLETE
  return requiredDocs.every((doc) => ['VERIFIED', 'WAIVED'].includes(doc.status))
}

export function isJoiningConfigComplete(preboarding = {}) {
  const offer = preboarding.offer || {}
  return [
    preboarding.departmentId || offer.departmentId,
    preboarding.designation || offer.designation || offer.designationId,
    preboarding.locationId || offer.locationId || preboarding.workLocation || offer.location,
    preboarding.shiftId || offer.shiftId,
    preboarding.reportingManager || offer.reportingManager || offer.managerId,
    preboarding.confirmedJoiningDate || preboarding.joiningDate || offer.joiningDate,
    preboarding.ctc || offer.ctc,
  ].every(hasValue)
}

export function isAccessSetupComplete(preboarding = {}) {
  return hasValue(preboarding.employeeLoginEmail) && !!preboarding.employeePasswordConfiguredAt
}

export function buildPreboardingMilestones(preboarding = {}) {
  const converted = preboarding.conversionStatus === 'COMPLETED' || !!preboarding.convertedEmployeeId
  const milestones = [
    {
      id: 'employee-details',
      name: 'Employee Details',
      description: 'Personal, emergency, bank, and statutory details are saved.',
      status: isEmployeeDetailsComplete(preboarding) ? 'COMPLETED' : 'PENDING',
      priority: 'High',
      required: true,
      targetTab: 'employee_details',
    },
    {
      id: 'documents',
      name: 'Documents Uploaded & Verified',
      description: 'All mandatory joining documents are uploaded and approved.',
      status: areDocumentsComplete(preboarding) ? 'COMPLETED' : 'PENDING',
      priority: 'High',
      required: true,
      targetTab: 'documents',
    },
    {
      id: 'joining-config',
      name: 'Joining & Configuration',
      description: 'Department, branch, shift, manager, joining date, and CTC are configured.',
      status: isJoiningConfigComplete(preboarding) ? 'COMPLETED' : 'PENDING',
      priority: 'Medium',
      required: true,
      targetTab: 'joining',
    },
    {
      id: 'login-access',
      name: 'Login ID & Password',
      description: 'Employee login email and initial password are set during conversion.',
      status: converted || isAccessSetupComplete(preboarding) ? 'COMPLETED' : 'PENDING',
      priority: 'Medium',
      required: true,
      targetTab: 'convert',
    },
    {
      id: 'employee-created',
      name: 'Converted to Employee',
      description: 'Employee master profile is created in the employee database.',
      status: converted ? 'COMPLETED' : 'PENDING',
      priority: 'High',
      required: true,
      targetTab: 'convert',
    },
  ]

  const completed = milestones.filter((milestone) => milestone.status === 'COMPLETED').length
  return {
    milestones,
    progress: Math.round((completed / milestones.length) * 100),
    pending: milestones.filter((milestone) => milestone.required && milestone.status !== 'COMPLETED'),
  }
}
