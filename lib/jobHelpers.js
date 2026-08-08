// Shared server-side helpers for the Open Positions / Job API routes —
// mirrors lib/requisitionHelpers.js's shape and reuses its actor-name
// lookup (it's generic, not requisition-specific).
import { formatDate } from './utils'
import { getActorName } from './requisitionHelpers'
import JobSkill from '@/models/JobSkill'
import JobScreeningQuestion from '@/models/JobScreeningQuestion'
import JobApplicationField from '@/models/JobApplicationField'
import JobPipelineStage from '@/models/JobPipelineStage'
import { SKILL_TYPE, DEFAULT_APPLICATION_FIELDS, PIPELINE_TEMPLATES } from './jobConstants'

export { getActorName }

const EMPLOYEE_FIELDS = 'firstName lastName employeeCode email'

export function populateJob(query) {
  return query
    .populate('department', 'name')
    .populate('designation', 'name')
    .populate('location', 'name')
    .populate('hiringManager', EMPLOYEE_FIELDS)
    .populate('recruiter', EMPLOYEE_FIELDS)
    .populate('createdByEmployee', EMPLOYEE_FIELDS)
    .populate('requisitionId', 'requisitionCode jobTitle status')
}

// JOB-2026-0001, scoped per tenant per calendar year.
export async function generateJobCode(Job, tenantId) {
  const year = new Date().getFullYear()
  const prefix = `JOB-${year}-`
  const existing = await Job.find({ tenantId, jobCode: { $regex: `^${prefix}` } }).select('jobCode')
  const maxSeq = existing.reduce((max, j) => {
    const match = /(\d+)$/.exec(j.jobCode || '')
    return match ? Math.max(max, parseInt(match[1], 10)) : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

function normalizeSkillRows(tenantId, jobId, rows, type) {
  return (rows || [])
    .filter((r) => r && (typeof r === 'string' ? r.trim() : r.skillName))
    .map((r) => (typeof r === 'string'
      ? { tenantId, jobId, skillName: r, type, minYears: null, proficiency: null }
      : { tenantId, jobId, skillName: r.skillName, type, minYears: r.minYears ?? null, proficiency: r.proficiency || null }))
}

export async function syncJobSkills(tenantId, jobId, requiredSkills = [], preferredSkills = []) {
  await JobSkill.deleteMany({ tenantId, jobId })
  const docs = [
    ...normalizeSkillRows(tenantId, jobId, requiredSkills, SKILL_TYPE.REQUIRED),
    ...normalizeSkillRows(tenantId, jobId, preferredSkills, SKILL_TYPE.PREFERRED),
  ]
  if (docs.length) await JobSkill.insertMany(docs)
}

export async function getJobSkills(tenantId, jobId) {
  const skills = await JobSkill.find({ tenantId, jobId }).sort({ createdAt: 1 }).lean()
  const shape = (s) => ({ skillName: s.skillName, minYears: s.minYears, proficiency: s.proficiency })
  return {
    requiredSkills: skills.filter((s) => s.type === SKILL_TYPE.REQUIRED).map(shape),
    preferredSkills: skills.filter((s) => s.type === SKILL_TYPE.PREFERRED).map(shape),
  }
}

export async function syncScreeningQuestions(tenantId, jobId, questions) {
  if (questions === undefined) return
  await JobScreeningQuestion.deleteMany({ tenantId, jobId })
  const docs = (questions || [])
    .filter((q) => q?.question?.trim())
    .map((q, i) => ({
      tenantId, jobId,
      question: q.question,
      type: q.type || 'TEXT',
      options: q.options || [],
      isRequired: q.isRequired ?? true,
      isKnockout: q.isKnockout ?? false,
      rule: q.rule || null,
      order: i,
    }))
  if (docs.length) await JobScreeningQuestion.insertMany(docs)
}

export async function getScreeningQuestions(tenantId, jobId) {
  return JobScreeningQuestion.find({ tenantId, jobId }).sort({ order: 1 }).lean()
}

export async function syncApplicationFields(tenantId, jobId, fields) {
  // Never wipe to nothing — an empty/omitted list on first create falls
  // back to a sane default application form instead of no fields at all.
  const rows = (fields === undefined || fields === null || fields.length === 0) ? DEFAULT_APPLICATION_FIELDS : fields
  await JobApplicationField.deleteMany({ tenantId, jobId })
  const docs = rows.map((f) => ({ tenantId, jobId, fieldName: f.fieldName, requirement: f.requirement || 'OPTIONAL' }))
  if (docs.length) await JobApplicationField.insertMany(docs)
}

export async function getApplicationFields(tenantId, jobId) {
  const fields = await JobApplicationField.find({ tenantId, jobId }).lean()
  return fields.map((f) => ({ fieldName: f.fieldName, requirement: f.requirement }))
}

export async function syncPipelineStages(tenantId, jobId, stages, pipelineTemplate) {
  const rows = (stages && stages.length)
    ? stages
    : (PIPELINE_TEMPLATES[pipelineTemplate] || PIPELINE_TEMPLATES.DEFAULT_HIRING).stages
  await JobPipelineStage.deleteMany({ tenantId, jobId })
  const docs = rows.map((s, i) => ({
    tenantId, jobId, name: s.name, category: s.category, order: i, isActive: s.isActive ?? true,
  }))
  if (docs.length) await JobPipelineStage.insertMany(docs)
}

export async function getPipelineStages(tenantId, jobId) {
  const stages = await JobPipelineStage.find({ tenantId, jobId }).sort({ order: 1 }).lean()
  // _id is included so Step 5's "Move Stage" action can target a specific
  // stage document — omitted from the create/edit payload shape elsewhere
  // since PipelineStagesEditor always replaces the full list on save.
  return stages.map((s) => ({ _id: String(s._id), name: s.name, category: s.category, order: s.order, isActive: s.isActive }))
}

export async function getJobRelatedData(tenantId, jobId) {
  const [skills, screeningQuestions, applicationFields, pipelineStages] = await Promise.all([
    getJobSkills(tenantId, jobId),
    getScreeningQuestions(tenantId, jobId),
    getApplicationFields(tenantId, jobId),
    getPipelineStages(tenantId, jobId),
  ])
  return { ...skills, screeningQuestions, applicationFields, pipelineStages }
}

export const JOB_WRITABLE_FIELDS = [
  'jobTitle', 'department', 'designation', 'totalOpenings', 'employmentType', 'workMode', 'location',
  'hiringManager', 'recruiter',
  'minExperience', 'maxExperience', 'minEducation', 'preferredEducation', 'certifications', 'industryExperience', 'freshersAllowed',
  'internalMinCtc', 'internalMaxCtc', 'publicSalaryVisible', 'publicMinCtc', 'publicMaxCtc', 'currency',
  'jobSummary', 'responsibilities', 'requiredQualifications', 'preferredQualifications', 'aboutRole', 'benefits', 'perks',
  'publicTitle', 'publicDescription',
  'pipelineTemplate',
  'openingDate', 'applicationDeadline', 'expectedJoiningDate', 'targetClosingDate',
  'visibility',
]

export function applyWritableJobFields(job, body) {
  for (const field of JOB_WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      job[field] = body[field] === '' ? null : body[field]
    }
  }
}

// Rule 8 — "major" field changes get an explicit activity-log line (not
// just a generic "Updated"), even though the whole job stays editable while
// OPEN. Matches the spec's own example: "Application deadline changed 15
// Aug -> 20 Aug".
const MAJOR_FIELD_LABELS = {
  jobTitle: 'Job title',
  totalOpenings: 'Number of openings',
  internalMinCtc: 'Minimum internal CTC',
  internalMaxCtc: 'Maximum internal CTC',
  applicationDeadline: 'Application deadline',
  expectedJoiningDate: 'Expected joining date',
}

function displayValue(field, value) {
  if (value == null || value === '') return 'not set'
  if (field.toLowerCase().includes('date') || field === 'applicationDeadline') return formatDate(value, 'dd MMM')
  return String(value)
}

export function describeMajorChanges(job, body) {
  const messages = []
  for (const [field, label] of Object.entries(MAJOR_FIELD_LABELS)) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue
    const oldValue = job[field]
    const newValue = body[field] === '' ? null : body[field]
    const oldComparable = oldValue instanceof Date ? oldValue.toISOString() : oldValue
    const newComparable = newValue
    if (String(oldComparable ?? '') === String(newComparable ?? '')) continue
    messages.push(`${label} changed: ${displayValue(field, oldValue)} → ${displayValue(field, newValue)}`)
  }
  return messages
}
