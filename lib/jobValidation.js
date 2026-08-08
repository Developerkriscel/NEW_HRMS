// Shared field validation for Job Openings — same split as
// lib/recruitmentValidation.js: `validateAlways` runs on every save
// (including Draft), `validateForOpen` is the full required-field gate that
// only applies when actually opening (publishing) the job.
export function validateAlways(data) {
  const errors = {}

  if (data.totalOpenings != null && Number(data.totalOpenings) < 1) {
    errors.totalOpenings = 'Number of openings must be at least 1' // Rule 4
  }

  if (data.minExperience != null && data.maxExperience != null && Number(data.minExperience) > Number(data.maxExperience)) {
    errors.minExperience = 'Minimum experience cannot exceed maximum experience' // Rule 5
  }

  if (data.openingDate && data.applicationDeadline) {
    if (new Date(data.applicationDeadline) < new Date(data.openingDate)) {
      errors.applicationDeadline = 'Application deadline cannot be before the opening date' // Rule 6
    }
  }

  if (data.openingDate && data.expectedJoiningDate) {
    if (new Date(data.expectedJoiningDate) < new Date(data.openingDate)) {
      errors.expectedJoiningDate = 'Expected joining date cannot be before the opening date' // Rule 7
    }
  }

  if (data.internalMinCtc != null && data.internalMaxCtc != null && Number(data.internalMinCtc) > Number(data.internalMaxCtc)) {
    errors.internalMinCtc = 'Minimum CTC cannot exceed maximum CTC'
  }
  if (data.publicMinCtc != null && data.publicMaxCtc != null && Number(data.publicMinCtc) > Number(data.publicMaxCtc)) {
    errors.publicMinCtc = 'Minimum public salary cannot exceed maximum'
  }

  return errors
}

// Full required-field check, only enforced by the /open action — a Draft
// may be incomplete by design.
export function validateForOpen(data) {
  const errors = validateAlways(data)

  const required = {
    jobTitle: 'Job title is required',
    department: 'Department is required',
    designation: 'Designation is required',
    totalOpenings: 'Number of openings is required',
    hiringManager: 'Hiring manager is required',
    recruiter: 'Recruiter is required',
    location: 'Location is required',
    workMode: 'Work mode is required',
    employmentType: 'Employment type is required',
    minExperience: 'Minimum experience is required',
    maxExperience: 'Maximum experience is required',
    jobSummary: 'Job summary is required',
    responsibilities: 'Responsibilities are required',
    requiredQualifications: 'Required qualifications are required',
  }
  for (const [field, message] of Object.entries(required)) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors[field] = errors[field] || message
    }
  }

  return errors
}

export function isValid(errors) {
  return Object.keys(errors).length === 0
}
