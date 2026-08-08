// Shared field validation for Job Requisitions — imported by both the
// create/edit form (inline validation as HR types) and the backend routes
// (the authoritative check; the frontend copy is just UX, never trusted).
import { HIRING_REASON } from './recruitmentConstants'

// Always-on data-integrity rules (Rules 4-7), independent of draft vs submit
// — a bad value shouldn't be storable even in a draft. Rule 8 (replacement
// employee must belong to the same tenant) needs a DB lookup and is checked
// separately, server-side only, in the requisitions API routes.
export function validateAlways(data) {
  const errors = {}

  if (data.openings != null && Number(data.openings) < 1) {
    errors.openings = 'Number of openings must be at least 1' // Rule 4
  }

  if (data.minExperience != null && data.maxExperience != null && Number(data.minExperience) > Number(data.maxExperience)) {
    errors.minExperience = 'Minimum experience cannot exceed maximum experience' // Rule 5
  }

  if (data.minCtc != null && data.maxCtc != null && Number(data.minCtc) > Number(data.maxCtc)) {
    errors.minCtc = 'Minimum CTC cannot exceed maximum CTC' // Rule 6
  }

  if (data.expectedJoiningDate) {
    const joining = new Date(data.expectedJoiningDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (joining < today) errors.expectedJoiningDate = 'Expected joining date cannot be in the past' // Rule 7
  }

  return errors
}

// Full required-field check (Rule 1) — only enforced when submitting for
// approval. Drafts may be incomplete by design.
export function validateForSubmit(data) {
  const errors = validateAlways(data)

  const required = {
    jobTitle: 'Job title is required',
    department: 'Department is required',
    designation: 'Designation is required',
    openings: 'Number of openings is required',
    employmentType: 'Employment type is required',
    workMode: 'Work mode is required',
    location: 'Location / Branch is required',
    hiringManager: 'Hiring manager is required',
    hiringReason: 'Hiring reason is required',
    minExperience: 'Minimum experience is required',
    maxExperience: 'Maximum experience is required',
    priority: 'Priority is required',
    expectedJoiningDate: 'Expected joining date is required',
    jobSummary: 'Job summary is required',
    responsibilities: 'Responsibilities are required',
    requiredQualifications: 'Required qualifications are required',
  }
  for (const [field, message] of Object.entries(required)) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors[field] = errors[field] || message
    }
  }

  if (!data.requiredSkills || data.requiredSkills.length === 0) {
    errors.requiredSkills = 'At least one required skill is needed'
  }

  if (data.hiringReason === HIRING_REASON.REPLACEMENT && !data.replacementEmployee) {
    errors.replacementEmployee = 'Select the employee being replaced'
  }
  if (data.hiringReason === HIRING_REASON.OTHER && !data.otherReasonDetails) {
    errors.otherReasonDetails = 'Reason details are required'
  }

  return errors
}

export function isValid(errors) {
  return Object.keys(errors).length === 0
}
