export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolvePreboardingTokenClaims, resolvePreboardingAccessToken } from '@/lib/preboardingTokenHelpers'
import { assemblePreboardingAutoFill, recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import { FORM_STATUS, PREBOARDING_STATUS } from '@/lib/preboardingConstants'
import Preboarding from '@/models/Preboarding'
import PreboardingPersonalDetails from '@/models/PreboardingPersonalDetails'
import PreboardingEmergencyContact from '@/models/PreboardingEmergencyContact'
import PreboardingEmploymentHistory from '@/models/PreboardingEmploymentHistory'
import PreboardingEducation from '@/models/PreboardingEducation'
import PreboardingBankDetails from '@/models/PreboardingBankDetails'
import PreboardingStatutoryDetails from '@/models/PreboardingStatutoryDetails'
import CandidateDocument from '@/models/CandidateDocument'

// GET — the candidate form's landing data: read-only Employment Details
// (Section 3), suggested pre-fill for the editable sections, whatever the
// candidate has already saved, and any active correction request. First
// open flips SENT -> OPENED.
export const GET = withApi(async (req, { params }) => {
  const claims = await resolvePreboardingTokenClaims(params.token)
  if (!claims) return fail('This form link is invalid', 404, 'INVALID_TOKEN')

  return runForTenant(claims.tenant, async () => {
    const tokenDoc = await resolvePreboardingAccessToken(claims.tenant._id, claims.preboardingId, claims.jti, claims.offerId)
    if (!tokenDoc) return fail('This form link is invalid', 404, 'INVALID_TOKEN')
    if (!tokenDoc.offerAccepted) {
      return fail('Please accept your offer before completing employee details.', 403, 'OFFER_ACCEPTANCE_REQUIRED', { offerUrl: `/candidate/offer/${params.token}` })
    }
    const preboardingId = tokenDoc.preboardingId || claims.preboardingId

    const preboarding = await Preboarding.findOne({ _id: preboardingId, tenantId: claims.tenant._id, deleted: false }).populate('candidateId')
    if (!preboarding) return fail('This form link is invalid', 404, 'INVALID_TOKEN')

    if (preboarding.formStatus === FORM_STATUS.SENT) {
      preboarding.formStatus = FORM_STATUS.OPENED
      preboarding.formOpenedAt = new Date()
      await preboarding.save()
    }

    const [autoFill, personal, emergencyContact, employmentHistory, education, bank, statutory, documents] = await Promise.all([
      assemblePreboardingAutoFill(claims.tenant._id, preboarding),
      PreboardingPersonalDetails.findOne({ tenantId: claims.tenant._id, preboardingId }).lean(),
      PreboardingEmergencyContact.findOne({ tenantId: claims.tenant._id, preboardingId }).lean(),
      PreboardingEmploymentHistory.find({ tenantId: claims.tenant._id, preboardingId, deleted: false }).sort({ order: 1 }).lean(),
      PreboardingEducation.find({ tenantId: claims.tenant._id, preboardingId, deleted: false }).sort({ order: 1 }).lean(),
      PreboardingBankDetails.findOne({ tenantId: claims.tenant._id, preboardingId }).lean(),
      PreboardingStatutoryDetails.findOne({ tenantId: claims.tenant._id, preboardingId }).lean(),
      CandidateDocument.find({ tenantId: claims.tenant._id, preboardingId, deleted: false })
        .select('requirementId name category isRequired status rejectionReason').lean(),
    ])

    return ok({
      candidateName: preboarding.candidateId ? `${preboarding.candidateId.firstName} ${preboarding.candidateId.lastName}` : null,
      companyName: claims.tenant.companyName,
      employeeId: preboarding.employeeCode || null,
      formStatus: preboarding.formStatus,
      isCancelled: preboarding.status === PREBOARDING_STATUS.CANCELLED,
      correctionRequest: preboarding.correctionRequest,
      documents,
      autoFill,
      personal, emergencyContact, employmentHistory, education, bank, statutory,
      joining: {
        availableToJoin: preboarding.availableToJoin,
        relocationRequired: preboarding.relocationRequired,
        accommodationRequired: preboarding.accommodationRequired,
        requestedJoiningDate: preboarding.requestedJoiningDate,
        requestedJoiningReason: preboarding.requestedJoiningReason,
      },
    })
  })
})

const EDITABLE_FORM_STATUSES = [FORM_STATUS.SENT, FORM_STATUS.OPENED, FORM_STATUS.IN_PROGRESS, FORM_STATUS.CORRECTION_REQUIRED]
const PERSONAL_FIELDS = ['fullLegalName', 'preferredName', 'dateOfBirth', 'personalEmail', 'mobileNumber', 'currentAddress', 'permanentAddress', 'declarationAccurate', 'declarationWillNotify']
const EMERGENCY_FIELDS = ['contactName', 'relationship', 'phone', 'alternatePhone']
const BANK_FIELDS = ['accountHolderName', 'bankName', 'bankAccountNumber', 'bankIfscCode', 'bankBranch']
const STATUTORY_FIELDS = ['panNumber', 'uanNumber', 'previousPfMember']
const STATUTORY_CUSTOM_FIELDS = ['fatherName', 'motherName', 'spouseName', 'bloodGroup', 'gender', 'maritalStatus', 'anniversaryDate', 'aadhaarNumber', 'pfNumber', 'esiNumber']
const JOINING_FIELDS = ['availableToJoin', 'relocationRequired', 'accommodationRequired', 'requestedJoiningDate', 'requestedJoiningReason']

function pickFields(source, allowedFields) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {}
  return Object.fromEntries(allowedFields.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]))
}

// PATCH { personal?, emergencyContact?, employmentHistory?, education?,
//         bank?, statutory?, joining? } — "[Save Draft]". Every section is
// optional and independently upserted; array sections (employmentHistory/
// education) are a full replace of that candidate's rows, which is simpler
// and safe since this is a draft the candidate owns exclusively.
export const PATCH = withApi(async (req, { params }) => {
  const claims = await resolvePreboardingTokenClaims(params.token)
  if (!claims) return fail('This form link is invalid', 404, 'INVALID_TOKEN')
  const body = await req.json().catch(() => ({}))

  return runForTenant(claims.tenant, async () => {
    const tokenDoc = await resolvePreboardingAccessToken(claims.tenant._id, claims.preboardingId, claims.jti, claims.offerId)
    if (!tokenDoc) return fail('This form link is invalid', 404, 'INVALID_TOKEN')
    if (!tokenDoc.offerAccepted) {
      return fail('Please accept your offer before completing employee details.', 403, 'OFFER_ACCEPTANCE_REQUIRED', { offerUrl: `/candidate/offer/${params.token}` })
    }

    const preboarding = await Preboarding.findOne({ _id: tokenDoc.preboardingId || claims.preboardingId, tenantId: claims.tenant._id, deleted: false })
    if (!preboarding) return fail('This form link is invalid', 404, 'INVALID_TOKEN')
    if (preboarding.status === PREBOARDING_STATUS.CANCELLED) return fail('This preboarding is no longer active', 400, 'INVALID_STATE')
    if (!EDITABLE_FORM_STATUSES.includes(preboarding.formStatus)) {
      return fail('This form can no longer be edited', 400, 'INVALID_STATE')
    }

    const tenantId = claims.tenant._id
    const preboardingId = preboarding._id

    if (body.personal) {
      await PreboardingPersonalDetails.findOneAndUpdate({ tenantId, preboardingId }, { $set: pickFields(body.personal, PERSONAL_FIELDS) }, { upsert: true })
    }
    if (body.emergencyContact) {
      await PreboardingEmergencyContact.findOneAndUpdate({ tenantId, preboardingId }, { $set: pickFields(body.emergencyContact, EMERGENCY_FIELDS) }, { upsert: true })
    }
    if (body.bank) {
      await PreboardingBankDetails.findOneAndUpdate({ tenantId, preboardingId }, { $set: pickFields(body.bank, BANK_FIELDS) }, { upsert: true })
    }
    if (body.statutory) {
      const statutoryPatch = pickFields(body.statutory, STATUTORY_FIELDS)
      const customFields = pickFields(body.statutory.customFields, STATUTORY_CUSTOM_FIELDS)
      const customFieldPatch = Object.fromEntries(Object.entries(customFields).map(([key, value]) => [`customFields.${key}`, value]))
      await PreboardingStatutoryDetails.findOneAndUpdate(
        { tenantId, preboardingId },
        { $set: { ...statutoryPatch, ...customFieldPatch } },
        { upsert: true }
      )
    }
    if (Array.isArray(body.employmentHistory)) {
      await PreboardingEmploymentHistory.deleteMany({ tenantId, preboardingId })
      if (body.employmentHistory.length) {
        await PreboardingEmploymentHistory.insertMany(body.employmentHistory.map((e, i) => ({ tenantId, preboardingId, ...pickFields(e, ['employerName', 'designation', 'startDate', 'endDate', 'employeeId', 'reasonForLeaving']), order: i })))
      }
    }
    if (Array.isArray(body.education)) {
      await PreboardingEducation.deleteMany({ tenantId, preboardingId })
      if (body.education.length) {
        await PreboardingEducation.insertMany(body.education.map((e, i) => ({ tenantId, preboardingId, ...pickFields(e, ['degree', 'specialization', 'institution', 'university', 'startYear', 'completionYear', 'score']), order: i })))
      }
    }
    if (body.joining) {
      const joiningPatch = pickFields(body.joining, JOINING_FIELDS)
      if (joiningPatch.availableToJoin !== undefined) preboarding.availableToJoin = joiningPatch.availableToJoin
      if (joiningPatch.relocationRequired !== undefined) preboarding.relocationRequired = joiningPatch.relocationRequired
      if (joiningPatch.accommodationRequired !== undefined) preboarding.accommodationRequired = joiningPatch.accommodationRequired
      if (joiningPatch.requestedJoiningDate !== undefined) preboarding.requestedJoiningDate = joiningPatch.requestedJoiningDate || null
      if (joiningPatch.requestedJoiningReason !== undefined) preboarding.requestedJoiningReason = joiningPatch.requestedJoiningReason || null
    }

    if ([FORM_STATUS.SENT, FORM_STATUS.OPENED].includes(preboarding.formStatus)) preboarding.formStatus = FORM_STATUS.IN_PROGRESS
    await recomputePreboardingStatus(tenantId, preboarding)
    await preboarding.save()

    return ok(null, 'Draft saved')
  })
})
