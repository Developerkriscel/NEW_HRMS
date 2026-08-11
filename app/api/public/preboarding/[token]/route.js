export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolvePreboardingTokenClaims, resolvePreboardingAccessToken } from '@/lib/preboardingTokenHelpers'
import { assemblePreboardingAutoFill } from '@/lib/preboardingHelpers'
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
    const tokenDoc = await resolvePreboardingAccessToken(claims.tenant._id, claims.preboardingId, claims.jti)
    if (!tokenDoc) return fail('This form link is invalid', 404, 'INVALID_TOKEN')

    const preboarding = await Preboarding.findOne({ _id: claims.preboardingId, tenantId: claims.tenant._id, deleted: false }).populate('candidateId')
    if (!preboarding) return fail('This form link is invalid', 404, 'INVALID_TOKEN')

    if (preboarding.formStatus === FORM_STATUS.SENT) {
      preboarding.formStatus = FORM_STATUS.OPENED
      preboarding.formOpenedAt = new Date()
      await preboarding.save()
    }

    const [autoFill, personal, emergencyContact, employmentHistory, education, bank, statutory, documents] = await Promise.all([
      assemblePreboardingAutoFill(claims.tenant._id, preboarding),
      PreboardingPersonalDetails.findOne({ tenantId: claims.tenant._id, preboardingId: preboarding._id }).lean(),
      PreboardingEmergencyContact.findOne({ tenantId: claims.tenant._id, preboardingId: preboarding._id }).lean(),
      PreboardingEmploymentHistory.find({ tenantId: claims.tenant._id, preboardingId: preboarding._id, deleted: false }).sort({ order: 1 }).lean(),
      PreboardingEducation.find({ tenantId: claims.tenant._id, preboardingId: preboarding._id, deleted: false }).sort({ order: 1 }).lean(),
      PreboardingBankDetails.findOne({ tenantId: claims.tenant._id, preboardingId: preboarding._id }).lean(),
      PreboardingStatutoryDetails.findOne({ tenantId: claims.tenant._id, preboardingId: preboarding._id }).lean(),
      CandidateDocument.find({ tenantId: claims.tenant._id, preboardingId: preboarding._id, deleted: false })
        .select('requirementId name category isRequired status rejectionReason').lean(),
    ])

    return ok({
      candidateName: preboarding.candidateId ? `${preboarding.candidateId.firstName} ${preboarding.candidateId.lastName}` : null,
      companyName: claims.tenant.companyName,
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
    const tokenDoc = await resolvePreboardingAccessToken(claims.tenant._id, claims.preboardingId, claims.jti)
    if (!tokenDoc) return fail('This form link is invalid', 404, 'INVALID_TOKEN')

    const preboarding = await Preboarding.findOne({ _id: claims.preboardingId, tenantId: claims.tenant._id, deleted: false })
    if (!preboarding) return fail('This form link is invalid', 404, 'INVALID_TOKEN')
    if (preboarding.status === PREBOARDING_STATUS.CANCELLED) return fail('This preboarding is no longer active', 400, 'INVALID_STATE')
    if (!EDITABLE_FORM_STATUSES.includes(preboarding.formStatus)) {
      return fail('This form can no longer be edited', 400, 'INVALID_STATE')
    }

    const tenantId = claims.tenant._id
    const preboardingId = preboarding._id

    if (body.personal) {
      await PreboardingPersonalDetails.findOneAndUpdate({ tenantId, preboardingId }, { $set: body.personal }, { upsert: true })
    }
    if (body.emergencyContact) {
      await PreboardingEmergencyContact.findOneAndUpdate({ tenantId, preboardingId }, { $set: body.emergencyContact }, { upsert: true })
    }
    if (body.bank) {
      await PreboardingBankDetails.findOneAndUpdate({ tenantId, preboardingId }, { $set: body.bank }, { upsert: true })
    }
    if (body.statutory) {
      await PreboardingStatutoryDetails.findOneAndUpdate({ tenantId, preboardingId }, { $set: body.statutory }, { upsert: true })
    }
    if (Array.isArray(body.employmentHistory)) {
      await PreboardingEmploymentHistory.deleteMany({ tenantId, preboardingId })
      if (body.employmentHistory.length) {
        await PreboardingEmploymentHistory.insertMany(body.employmentHistory.map((e, i) => ({ tenantId, preboardingId, ...e, order: i })))
      }
    }
    if (Array.isArray(body.education)) {
      await PreboardingEducation.deleteMany({ tenantId, preboardingId })
      if (body.education.length) {
        await PreboardingEducation.insertMany(body.education.map((e, i) => ({ tenantId, preboardingId, ...e, order: i })))
      }
    }
    if (body.joining) {
      if (body.joining.availableToJoin !== undefined) preboarding.availableToJoin = body.joining.availableToJoin
      if (body.joining.relocationRequired !== undefined) preboarding.relocationRequired = body.joining.relocationRequired
      if (body.joining.accommodationRequired !== undefined) preboarding.accommodationRequired = body.joining.accommodationRequired
      if (body.joining.requestedJoiningDate !== undefined) preboarding.requestedJoiningDate = body.joining.requestedJoiningDate || null
      if (body.joining.requestedJoiningReason !== undefined) preboarding.requestedJoiningReason = body.joining.requestedJoiningReason || null
    }

    if ([FORM_STATUS.SENT, FORM_STATUS.OPENED].includes(preboarding.formStatus)) preboarding.formStatus = FORM_STATUS.IN_PROGRESS
    await preboarding.save()

    return ok(null, 'Draft saved')
  })
})
