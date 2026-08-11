// Step 13/14 — shared server-side helpers, same shape as
// lib/selectionHelpers.js / lib/compensationHelpers.js.
import { OFFER_VERSION_STATUS, OFFER_STATUS } from './offerConstants'
import { DEFAULT_OFFER_TEMPLATES } from './offerTemplateSeeds'
import { resolveOfferAccessToken } from './offerTokenHelpers'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import OfferTemplate from '@/models/OfferTemplate'
import SelectionDecision from '@/models/SelectionDecision'
import CompensationProposal from '@/models/CompensationProposal'
import Preboarding from '@/models/Preboarding'
import Designation from '@/models/Designation'
import Department from '@/models/Department'
import Employee from '@/models/Employee'
import Branch from '@/models/Branch'

// OFF-2026-0001, scoped per tenant per calendar year — same
// scan-for-highest-existing-number approach as candidate/application codes.
export async function generateOfferCode(tenantId) {
  const year = new Date().getFullYear()
  const prefix = `OFF-${year}-`
  const existing = await Offer.find({ tenantId, offerCode: { $regex: `^${prefix}` } }).select('offerCode')
  const maxSeq = existing.reduce((max, doc) => {
    const match = /(\d+)$/.exec(doc.offerCode || '')
    return match ? Math.max(max, parseInt(match[1], 10)) : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

// {{snake_case}} substitution — deliberately dumb (no conditionals/loops):
// "avoid building legal text directly into code" just means the *wording*
// lives in the template, not that this needs to be a full templating
// engine. Unresolved variables are left as-is rather than silently
// blanked, so a typo in a template is obvious when previewed.
export function renderOfferTemplate(content, variables) {
  if (!content) return ''
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const value = variables[key]
    return value != null && value !== '' ? String(value) : match
  })
}

function formatDateLong(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Builds the {{variable}} -> value map for a given (unsaved-or-saved) set
// of offer fields — used both for the live Preview and for freezing
// renderedContent at generation/edit time.
export function buildOfferVariables({ candidate, job, designation, department, manager, branch, fields, tenant }) {
  return {
    candidate_name: candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : '',
    candidate_id: candidate?.candidateCode || '',
    designation: designation?.name || '',
    department: department?.name || '',
    joining_date: formatDateLong(fields.joiningDate) || '',
    location: branch?.name || '',
    reporting_manager: manager ? (manager.getFullName ? manager.getFullName() : `${manager.firstName} ${manager.lastName}`) : '',
    annual_ctc: fields.ctc != null ? `₹${fields.ctc}L` : '',
    probation_period: fields.probationPeriod || '',
    offer_expiry: formatDateLong(fields.offerValidUntil) || '',
    company_name: tenant?.companyName || 'the company',
    employment_type: fields.employmentType || '',
    notice_period: fields.noticePeriod || '',
    work_mode: fields.workMode || '',
  }
}

// item 3's consolidated auto-fill — pulls forward everything Steps 11/12
// already decided so "HR should not retype these if the system already
// knows them." Compensation confidentiality still applies here (only
// called from routes already gated the same way offer creation is).
export async function assembleOfferAutoFill(tenantId, application) {
  const job = application.jobId // already populated by caller
  const candidate = application.candidateId

  const [selection, compensation, designation, department, manager, branch] = await Promise.all([
    SelectionDecision.findOne({ tenantId, applicationId: application._id, decision: 'SELECT' }).sort({ decidedAt: -1 }),
    CompensationProposal.findOne({ tenantId, applicationId: application._id, status: 'APPROVED' }).sort({ version: -1 }),
    job?.designation ? Designation.findById(job.designation) : null,
    job?.department ? Department.findById(job.department) : null,
    null, // resolved below once we know which manager id to prefer
    job?.location ? Branch.findById(job.location) : null,
  ])

  const managerId = selection?.recommendedManagerId || job?.hiringManager || null
  const resolvedManager = managerId ? await Employee.findById(managerId) : null

  return {
    candidate, job, selection, compensation,
    designation, department, manager: resolvedManager, branch,
    fields: {
      designationId: selection?.recommendedDesignationId || job?.designation || null,
      departmentId: selection?.recommendedDepartmentId || job?.department || null,
      managerId,
      joiningDate: selection?.proposedJoiningDate || job?.expectedJoiningDate || null,
      locationId: job?.location || null,
      employmentType: selection?.employmentType || job?.employmentType || null,
      workMode: job?.workMode || null,
      ctc: compensation?.totalCtc ?? null,
      salaryStructureId: compensation?.salaryStructureId || null,
      probationPeriod: '6 months',
      noticePeriod: candidate?.noticePeriod || '30 days',
    },
  }
}

export async function getLatestOfferVersion(tenantId, offerId) {
  return OfferVersion.findOne({ tenantId, offerId, deleted: false }).sort({ version: -1 })
}

// Same auto-seed-on-first-access pattern as interviewHelpers'
// ensureDefaultScorecardTemplates — a tenant gets the 5 starter templates
// the first time anyone opens the Offer Templates screen, no onboarding
// wizard step required.
export async function ensureDefaultOfferTemplates(tenantId) {
  const count = await OfferTemplate.countDocuments({ tenantId })
  if (count > 0) return
  await OfferTemplate.insertMany(
    DEFAULT_OFFER_TEMPLATES.map((tpl, i) => ({
      tenantId, name: tpl.name, category: tpl.category, description: tpl.description,
      content: tpl.content, isDefault: i === 0, createdByName: 'System',
    }))
  )
}

export async function getActiveTemplates(tenantId) {
  await ensureDefaultOfferTemplates(tenantId)
  return OfferTemplate.find({ tenantId, deleted: false, isActive: true }).sort({ name: 1 })
}

// item — Acceptance -> Preboarding handoff. "Do not create Employee Master
// yet" — this is deliberately the entire extent of what happens.
export async function createPreboardingRecord(tenantId, { application, offer, version }) {
  const existing = await Preboarding.findOne({ tenantId, applicationId: application._id })
  if (existing) return existing
  return Preboarding.create({
    tenantId,
    applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
    offerId: offer._id, offerVersionId: version._id,
    proposedJoiningDate: version.joiningDate,
  })
}

export const OFFER_STATUSES_EDITABLE = [OFFER_STATUS.DRAFT, OFFER_STATUS.REVISION_REQUESTED]
export const OFFER_VERSION_STATUSES_EDITABLE = [OFFER_VERSION_STATUS.DRAFT, OFFER_VERSION_STATUS.REVISION_REQUESTED, OFFER_VERSION_STATUS.REJECTED]

const CANDIDATE_TERMINAL_STATUSES = [OFFER_STATUS.ACCEPTED, OFFER_STATUS.DECLINED, OFFER_STATUS.WITHDRAWN, OFFER_STATUS.EXPIRED]

// Call inside runForTenant(tenant, ...) — stage 2 of the public offer flow
// (lib/offerTokenHelpers.js#resolveOfferTokenClaims is stage 1). Also
// lazily flips a past-expiry SENT/VIEWED offer to EXPIRED right here, so
// every public route sees an already-current status with no cron job —
// same "enforce on access" pattern as the Step 9 assessment token flow.
export async function loadOfferByToken(tenantId, offerId, jti) {
  const tokenDoc = await resolveOfferAccessToken(tenantId, offerId, jti)
  if (!tokenDoc) return null

  const offer = await Offer.findOne({ _id: offerId, tenantId, deleted: false }).populate('candidateId').populate('jobId')
  if (!offer) return null

  if (offer.expiresAt && new Date(offer.expiresAt) < new Date() && !CANDIDATE_TERMINAL_STATUSES.includes(offer.status)) {
    offer.status = OFFER_STATUS.EXPIRED
    offer.activityLog.push({ type: 'STATUS_CHANGED', message: 'Offer expired (validity date passed)' })
    await offer.save()
  }

  const version = offer.currentVersionId ? await OfferVersion.findOne({ _id: offer.currentVersionId, tenantId }) : null
  return { offer, version, tokenDoc }
}
