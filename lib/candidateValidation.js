// Shared validation for the public Application Form — used server-side (the
// authority) and mirrored client-side for inline errors before submit.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Maps the job's configured application fields (Step 3) to the form field
// name candidates actually fill in.
const CONFIGURABLE_FIELD_TO_FORM_KEY = {
  CURRENT_COMPANY: 'currentCompany',
  CURRENT_DESIGNATION: 'currentDesignation',
  CURRENT_CTC: 'currentCtc',
  EXPECTED_CTC: 'expectedCtc',
  NOTICE_PERIOD: 'noticePeriod',
  LINKEDIN: 'linkedinUrl',
  GITHUB: 'githubUrl',
  PORTFOLIO: 'portfolioUrl',
  COVER_LETTER: 'coverLetter',
}

export function validateApplicationForm(data, { applicationFields = [], screeningQuestions = [] }) {
  const errors = {}

  // Core fields — always required regardless of the job's field config.
  if (!data.firstName?.trim()) errors.firstName = 'Full name is required'
  if (!data.email?.trim() || !EMAIL_RE.test(data.email.trim())) errors.email = 'A valid email is required'
  if (!data.phone?.trim()) errors.phone = 'Phone number is required'

  if (!data.consentAccurate) errors.consentAccurate = 'Please confirm the information provided is accurate'
  if (!data.consentProcessing) errors.consentProcessing = 'Please agree to let us process your application data'

  for (const field of applicationFields) {
    const formKey = CONFIGURABLE_FIELD_TO_FORM_KEY[field.fieldName]
    if (!formKey || field.requirement !== 'REQUIRED') continue
    const value = data[formKey]
    if (value === undefined || value === null || String(value).trim() === '') {
      errors[formKey] = `This field is required`
    }
  }

  for (const q of screeningQuestions) {
    if (!q.isRequired) continue
    // `screeningQuestions` here is the raw Mongoose .lean() result (has
    // `_id`, not `id`) — the client's payload keys are String(_id), built
    // from the public payload's `id` field (see buildPublicJobDetail).
    const questionId = String(q._id || q.id)
    const answer = data.screeningAnswers?.[questionId]
    const empty = answer === undefined || answer === null || (Array.isArray(answer) ? answer.length === 0 : String(answer).trim() === '')
    if (empty) errors[`screening_${questionId}`] = 'This question is required'
  }

  return errors
}

export function isValid(errors) {
  return Object.keys(errors).length === 0
}

export { CONFIGURABLE_FIELD_TO_FORM_KEY }
