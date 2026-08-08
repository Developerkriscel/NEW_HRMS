// Shared server-side helpers for the Job Requisitions API routes — kept out
// of the route files themselves so list/get/patch/submit/approve/reject/
// cancel don't each reinvent code generation, actor-name lookup, populate
// chains and skill syncing.
import Employee from '@/models/Employee'
import RequisitionSkill from '@/models/RequisitionSkill'
import { SKILL_TYPE } from './recruitmentConstants'

const EMPLOYEE_FIELDS = 'firstName lastName employeeCode email'

export function populateRequisition(query) {
  return query
    .populate('department', 'name')
    .populate('designation', 'name')
    .populate('location', 'name')
    .populate('hiringManager', EMPLOYEE_FIELDS)
    .populate('recruiter', EMPLOYEE_FIELDS)
    .populate('replacementEmployee', EMPLOYEE_FIELDS)
    .populate('requestedBy', EMPLOYEE_FIELDS)
    .populate('approvedBy', EMPLOYEE_FIELDS)
    .populate('rejectedBy', EMPLOYEE_FIELDS)
    .populate('cancelledBy', EMPLOYEE_FIELDS)
}

// REQ-2026-0001, scoped per tenant per calendar year — mirrors the
// employeeCode generator in app/api/employees/route.js (scan existing codes
// for the highest trailing number rather than counting documents, so a
// deleted requisition's code is never reissued).
export async function generateRequisitionCode(JobRequisition, tenantId) {
  const year = new Date().getFullYear()
  const prefix = `REQ-${year}-`
  const existing = await JobRequisition.find({ tenantId, requisitionCode: { $regex: `^${prefix}` } }).select('requisitionCode')
  const maxSeq = existing.reduce((max, r) => {
    const match = /(\d+)$/.exec(r.requisitionCode || '')
    return match ? Math.max(max, parseInt(match[1], 10)) : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

export async function getActorName(session) {
  if (session.isSuperAdmin) return 'Super Admin'
  const employee = await Employee.findById(session.userId).select('firstName lastName').lean()
  return employee ? `${employee.firstName} ${employee.lastName}` : session.sub
}

// Full replace-on-save — simplest way to keep requisition_skills consistent
// with whatever tag set the form last submitted, without diffing.
export async function syncRequisitionSkills(tenantId, requisitionId, requiredSkills = [], preferredSkills = []) {
  await RequisitionSkill.deleteMany({ tenantId, requisitionId })
  const docs = [
    ...(requiredSkills || []).filter(Boolean).map((skillName) => ({ tenantId, requisitionId, skillName, type: SKILL_TYPE.REQUIRED })),
    ...(preferredSkills || []).filter(Boolean).map((skillName) => ({ tenantId, requisitionId, skillName, type: SKILL_TYPE.PREFERRED })),
  ]
  if (docs.length) await RequisitionSkill.insertMany(docs)
}

export async function getRequisitionSkills(tenantId, requisitionId) {
  const skills = await RequisitionSkill.find({ tenantId, requisitionId }).lean()
  return {
    requiredSkills: skills.filter((s) => s.type === SKILL_TYPE.REQUIRED).map((s) => s.skillName),
    preferredSkills: skills.filter((s) => s.type === SKILL_TYPE.PREFERRED).map((s) => s.skillName),
  }
}

// Rule 8: the replacement employee must belong to the same tenant.
export async function assertReplacementEmployeeValid(tenantId, employeeId) {
  if (!employeeId) return
  const exists = await Employee.exists({ _id: employeeId, tenantId })
  if (!exists) {
    const err = new Error('The employee being replaced must belong to your company')
    err.status = 400
    throw err
  }
}

// Fields the requisition form is allowed to write. Workflow fields
// (status, requestedBy, approvedBy, ...) only ever change via the
// submit/approve/reject/cancel actions, never through a plain PATCH.
export const REQUISITION_WRITABLE_FIELDS = [
  'jobTitle', 'department', 'designation', 'openings', 'employmentType', 'workMode', 'location',
  'hiringManager', 'recruiter',
  'hiringReason', 'replacementEmployee', 'replacementReason', 'lastWorkingDate', 'otherReasonDetails',
  'minExperience', 'maxExperience', 'education', 'certifications', 'industryExperience', 'roleSummary',
  'minCtc', 'maxCtc', 'currency', 'budgetType', 'budgetApproved',
  'expectedJoiningDate', 'applicationTargetDate', 'priority',
  'jobSummary', 'responsibilities', 'requiredQualifications', 'preferredQualifications', 'benefits', 'additionalNotes',
]

export function applyWritableFields(requisition, body) {
  for (const field of REQUISITION_WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      requisition[field] = body[field] === '' ? null : body[field]
    }
  }
}
