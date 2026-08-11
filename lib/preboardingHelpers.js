// Step 15/16 — shared server-side helpers, same shape as
// lib/offerHelpers.js / lib/selectionHelpers.js.
import {
  PREBOARDING_STATUS, FORM_STATUS, DOCUMENT_STATUS, VERIFICATION_STATUS,
  DOCUMENT_SATISFIED_STATUSES, DOCUMENT_UPLOADED_STATUSES, DOCUMENT_ITEM_STATUS,
} from './preboardingConstants'
import { DEFAULT_DOCUMENT_REQUIREMENTS } from './documentRequirementSeeds'
import Preboarding from '@/models/Preboarding'
import PreboardingPersonalDetails from '@/models/PreboardingPersonalDetails'
import PreboardingEmergencyContact from '@/models/PreboardingEmergencyContact'
import PreboardingEmploymentHistory from '@/models/PreboardingEmploymentHistory'
import PreboardingEducation from '@/models/PreboardingEducation'
import PreboardingBankDetails from '@/models/PreboardingBankDetails'
import PreboardingStatutoryDetails from '@/models/PreboardingStatutoryDetails'
import DocumentRequirement from '@/models/DocumentRequirement'
import CandidateDocument from '@/models/CandidateDocument'
import Application from '@/models/Application'
import Candidate from '@/models/Candidate'
import CandidateEducation from '@/models/CandidateEducation'
import CandidateExperience from '@/models/CandidateExperience'
import OfferVersion from '@/models/OfferVersion'
import Designation from '@/models/Designation'
import Department from '@/models/Department'
import Branch from '@/models/Branch'
import Employee from '@/models/Employee'

// Recomputes status/progressPercentage/documentStatus/verificationStatus
// from current form + document state — the one place that decides which of
// the 8 dashboard tabs a preboarding candidate falls into. Mutates the
// passed document; caller saves. Never touches JOINED/NO_SHOW/CANCELLED —
// those are explicit terminal HR actions, not derived.
const TERMINAL = [PREBOARDING_STATUS.JOINED, PREBOARDING_STATUS.NO_SHOW, PREBOARDING_STATUS.CANCELLED]

export async function recomputePreboardingStatus(tenantId, preboarding) {
  if (TERMINAL.includes(preboarding.status)) return preboarding

  const docs = await CandidateDocument.find({ tenantId, preboardingId: preboarding._id, deleted: false }).lean()
  const required = docs.filter((d) => d.isRequired)
  const uploadedCount = required.filter((d) => DOCUMENT_UPLOADED_STATUSES.includes(d.status)).length
  const satisfiedCount = required.filter((d) => DOCUMENT_SATISFIED_STATUSES.includes(d.status)).length

  const infoApproved = preboarding.formStatus === FORM_STATUS.APPROVED
  const documentsGenerated = docs.length > 0
  const uploadPercent = required.length ? Math.round((uploadedCount / required.length) * 100) : (documentsGenerated ? 100 : 0)
  const verifyPercent = required.length ? Math.round((satisfiedCount / required.length) * 100) : (documentsGenerated ? 100 : 0)

  preboarding.documentStatus = required.length && satisfiedCount < required.length ? DOCUMENT_STATUS.PENDING : DOCUMENT_STATUS.COMPLETE
  preboarding.verificationStatus = required.length && satisfiedCount < required.length ? VERIFICATION_STATUS.PENDING : VERIFICATION_STATUS.COMPLETE

  // Overall Progress — average of the 4 tracker milestones (Offer Accepted
  // is always done the moment this record exists).
  const infoPercent = preboarding.formStatus === FORM_STATUS.APPROVED ? 100
    : [FORM_STATUS.SUBMITTED, FORM_STATUS.CORRECTION_REQUIRED].includes(preboarding.formStatus) ? 50 : 0
  preboarding.progressPercentage = Math.round((100 + infoPercent + uploadPercent + verifyPercent) / 4)

  if (!infoApproved) {
    preboarding.status = PREBOARDING_STATUS.INFORMATION_PENDING
  } else if (!documentsGenerated || uploadedCount < required.length) {
    preboarding.status = PREBOARDING_STATUS.DOCUMENTS_PENDING
  } else if (satisfiedCount < required.length) {
    preboarding.status = PREBOARDING_STATUS.VERIFICATION_PENDING
  } else {
    preboarding.status = PREBOARDING_STATUS.READY_TO_JOIN
  }

  return preboarding
}

// item 7 — pre-fill from candidate profile / resume parsing / approved
// selection / accepted offer, so "candidate should verify/edit instead of
// retyping." Returns both the read-only Employment Details block (Section
// 3 — candidate can't edit these, only Request Correction) and suggested
// starting values for the sections that ARE editable.
export async function assemblePreboardingAutoFill(tenantId, preboarding) {
  const [application, candidate, version] = await Promise.all([
    Application.findOne({ tenantId, _id: preboarding.applicationId }).populate('jobId'),
    Candidate.findOne({ tenantId, _id: preboarding.candidateId }),
    OfferVersion.findOne({ tenantId, _id: preboarding.offerVersionId }),
  ])

  const [designation, department, branch, manager, educationRows, experienceRows] = await Promise.all([
    version?.designationId ? Designation.findById(version.designationId).select('name').lean() : null,
    version?.departmentId ? Department.findById(version.departmentId).select('name').lean() : null,
    version?.locationId ? Branch.findById(version.locationId).select('name').lean() : null,
    version?.managerId ? Employee.findById(version.managerId).select('firstName lastName').lean() : null,
    CandidateEducation.find({ tenantId, candidateId: preboarding.candidateId }).lean(),
    CandidateExperience.find({ tenantId, candidateId: preboarding.candidateId }).lean(),
  ])

  return {
    employmentDetails: {
      designation: designation?.name || null,
      department: department?.name || null,
      location: branch?.name || null,
      employmentType: version?.employmentType || null,
      reportingManager: manager ? `${manager.firstName} ${manager.lastName}` : null,
      joiningDate: preboarding.proposedJoiningDate,
    },
    personalSuggested: {
      fullLegalName: candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : null,
      personalEmail: candidate?.email || null,
      mobileNumber: candidate?.phone || null,
      currentAddress: candidate?.currentLocation || null,
    },
    educationSuggested: educationRows.map((e) => ({
      degree: e.degree, specialization: e.specialization, institution: e.institution,
      startYear: e.startYear, completionYear: e.endYear, score: e.score,
    })),
    employmentHistorySuggested: experienceRows.map((e) => ({
      employerName: e.companyName, designation: e.designation, startDate: e.startDate,
      endDate: e.endDate, reasonForLeaving: null,
    })),
  }
}

// Auto-creates the 8 blank detail rows a fresh preboarding profile needs —
// called once, right after the Preboarding parent is created, so every
// later GET/PATCH just updates an existing row instead of upserting.
export async function ensurePreboardingDetailRows(tenantId, preboardingId) {
  await Promise.all([
    PreboardingPersonalDetails.findOneAndUpdate({ tenantId, preboardingId }, { $setOnInsert: { tenantId, preboardingId } }, { upsert: true }),
    PreboardingEmergencyContact.findOneAndUpdate({ tenantId, preboardingId }, { $setOnInsert: { tenantId, preboardingId } }, { upsert: true }),
    PreboardingBankDetails.findOneAndUpdate({ tenantId, preboardingId }, { $setOnInsert: { tenantId, preboardingId } }, { upsert: true }),
    PreboardingStatutoryDetails.findOneAndUpdate({ tenantId, preboardingId }, { $setOnInsert: { tenantId, preboardingId } }, { upsert: true }),
  ])
}

// Same auto-seed-on-first-access pattern as offer templates / scorecard
// templates — a tenant gets sensible Full-Time/Intern defaults the first
// time anyone opens Document Requirements, fully editable from there.
export async function ensureDefaultDocumentRequirements(tenantId) {
  const count = await DocumentRequirement.countDocuments({ tenantId })
  if (count > 0) return
  await DocumentRequirement.insertMany(
    DEFAULT_DOCUMENT_REQUIREMENTS.map((r, i) => ({ tenantId, ...r, order: i }))
  )
}

// item — "Document Checklist" materialization: one candidate_documents row
// per active requirement that applies to this candidate's employment type.
// Idempotent (skips requirements a row already exists for), so it's safe to
// call again if a tenant adds a new requirement mid-flow.
export async function generateDocumentChecklist(tenantId, preboarding) {
  await ensureDefaultDocumentRequirements(tenantId)
  const version = await OfferVersion.findOne({ tenantId, _id: preboarding.offerVersionId }).select('employmentType')
  const employmentType = version?.employmentType || null

  const requirements = await DocumentRequirement.find({
    tenantId, isActive: true,
    $or: [{ employmentType: null }, { employmentType }],
  }).sort({ order: 1 })

  const existing = await CandidateDocument.find({ tenantId, preboardingId: preboarding._id }).select('requirementId')
  const existingIds = new Set(existing.map((d) => String(d.requirementId)))

  const toCreate = requirements
    .filter((r) => !existingIds.has(String(r._id)))
    .map((r) => ({
      tenantId, preboardingId: preboarding._id, candidateId: preboarding.candidateId, requirementId: r._id,
      name: r.name, category: r.category, isRequired: r.isRequired, requiresVerification: r.requiresVerification, tracksExpiry: r.tracksExpiry,
      status: DOCUMENT_ITEM_STATUS.NOT_UPLOADED,
    }))
  if (toCreate.length) await CandidateDocument.insertMany(toCreate)
}
