// Shared server-side helpers for the Candidate/Application API routes —
// same shape as lib/requisitionHelpers.js and lib/jobHelpers.js.
import { getActorName } from './requisitionHelpers'
import '@/models/Candidate'
import '@/models/Department'
import '@/models/Employee'
import '@/models/Job'
import RecruitmentCodeSequence from '@/models/RecruitmentCodeSequence'

export { getActorName }

// CAN-2026-0001 / APP-2026-0001, scoped per tenant per calendar year — same
// scan-for-highest-existing-number approach as every other readable code in
// this codebase (see e.g. app/api/employees/route.js).
async function generateCode(Model, tenantId, field, prefix) {
  const year = new Date().getFullYear()
  const namespace = `${prefix}:${field}`
  let sequence = await RecruitmentCodeSequence.findOne({ tenantId, namespace, year }).select('sequence').lean()
  if (!sequence) {
    const codePrefix = `${prefix}-${year}-`
    const latest = await Model.findOne({ tenantId, [field]: { $regex: `^${codePrefix}` } })
      .sort({ [field]: -1 })
      .select(field)
      .lean()
    const current = Number(String(latest?.[field] || '').match(/(\d+)$/)?.[1] || 0)
    await RecruitmentCodeSequence.updateOne(
      { tenantId, namespace, year },
      { $setOnInsert: { tenantId, namespace, year, sequence: current } },
      { upsert: true }
    )
  }
  const next = await RecruitmentCodeSequence.findOneAndUpdate(
    { tenantId, namespace, year },
    { $inc: { sequence: 1 } },
    { new: true, setDefaultsOnInsert: true }
  ).select('sequence').lean()
  return `${prefix}-${year}-${String(next.sequence).padStart(4, '0')}`
}

export async function generateCandidateCode(Candidate, tenantId) {
  return generateCode(Candidate, tenantId, 'candidateCode', 'CAN')
}

export async function generateApplicationCode(Application, tenantId) {
  return generateCode(Application, tenantId, 'applicationCode', 'APP')
}

const EMPLOYEE_FIELDS = 'firstName lastName employeeCode email'

export function populateCandidate(query) {
  return query
}

export function populateApplication(query) {
  return query
    .populate('candidateId')
    .populate({ path: 'jobId', select: 'jobCode jobTitle publicTitle department status', populate: { path: 'department', select: 'name' } })
    .populate('referrerEmployeeId', EMPLOYEE_FIELDS)
}

// Duplicate detection by email OR phone, within the tenant — reuse the
// existing Candidate rather than creating a second record for the same
// person (Rule: "Existing Candidate -> Create New Application for this Job").
export async function findExistingCandidate(Candidate, tenantId, { email, phone }) {
  return Candidate.findOne({
    tenantId, deleted: false,
    $or: [{ email: email?.toLowerCase() }, ...(phone ? [{ phone }] : [])],
  })
}

// Screening is advisory only — never auto-rejects. A knockout question
// "fails" when the candidate's answer doesn't meet `rule` (the minimum
// acceptable answer HR configured); the result just flags the application
// for HR's own judgment.
export function computeScreeningResult(answers) {
  const knockouts = answers.filter((a) => a.isKnockout && a.rule)
  if (!knockouts.length) return 'PASSED'

  for (const a of knockouts) {
    const rule = a.rule.trim()
    const value = a.answer
    if (a.questionType === 'NUMBER') {
      const numericAnswer = Number(value)
      const minimum = Number(rule)
      if (Number.isFinite(numericAnswer) && Number.isFinite(minimum) && numericAnswer < minimum) return 'NEEDS_REVIEW'
    } else if (a.questionType === 'YES_NO') {
      if (String(value).toLowerCase() !== rule.toLowerCase()) return 'NEEDS_REVIEW'
    } else {
      const answerText = Array.isArray(value) ? value.join(', ') : String(value ?? '')
      if (!answerText.toLowerCase().includes(rule.toLowerCase())) return 'NEEDS_REVIEW'
    }
  }
  return 'PASSED'
}
