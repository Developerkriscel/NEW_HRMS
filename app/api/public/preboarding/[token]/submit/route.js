export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolvePreboardingTokenClaims, resolvePreboardingAccessToken } from '@/lib/preboardingTokenHelpers'
import { FORM_STATUS, PREBOARDING_STATUS } from '@/lib/preboardingConstants'
import Preboarding from '@/models/Preboarding'
import PreboardingPersonalDetails from '@/models/PreboardingPersonalDetails'
import PreboardingEmergencyContact from '@/models/PreboardingEmergencyContact'

const EDITABLE_FORM_STATUSES = [FORM_STATUS.SENT, FORM_STATUS.OPENED, FORM_STATUS.IN_PROGRESS, FORM_STATUS.CORRECTION_REQUIRED]

// POST — "[Submit Information]". Validates the required fields are
// actually present server-side (never trusts the client form's own
// required-field enforcement), sets SUBMITTED, and leaves it for HR to
// review — "Do not automatically approve."
export const POST = withApi(async (req, { params }) => {
  const claims = await resolvePreboardingTokenClaims(params.token)
  if (!claims) return fail('This form link is invalid', 404, 'INVALID_TOKEN')

  return runForTenant(claims.tenant, async () => {
    const tokenDoc = await resolvePreboardingAccessToken(claims.tenant._id, claims.preboardingId, claims.jti)
    if (!tokenDoc) return fail('This form link is invalid', 404, 'INVALID_TOKEN')

    const tenantId = claims.tenant._id
    const preboarding = await Preboarding.findOne({ _id: claims.preboardingId, tenantId, deleted: false })
    if (!preboarding) return fail('This form link is invalid', 404, 'INVALID_TOKEN')
    if (preboarding.status === PREBOARDING_STATUS.CANCELLED) return fail('This preboarding is no longer active', 400, 'INVALID_STATE')
    if (!EDITABLE_FORM_STATUSES.includes(preboarding.formStatus)) return fail('This form has already been submitted', 400, 'INVALID_STATE')

    const [personal, emergencyContact] = await Promise.all([
      PreboardingPersonalDetails.findOne({ tenantId, preboardingId: preboarding._id }),
      PreboardingEmergencyContact.findOne({ tenantId, preboardingId: preboarding._id }),
    ])

    const missing = []
    if (!personal?.fullLegalName) missing.push('Full Legal Name')
    if (!personal?.dateOfBirth) missing.push('Date of Birth')
    if (!personal?.personalEmail) missing.push('Personal Email')
    if (!personal?.mobileNumber) missing.push('Mobile Number')
    if (!personal?.currentAddress) missing.push('Current Address')
    if (!emergencyContact?.contactName) missing.push('Emergency Contact Name')
    if (!emergencyContact?.relationship) missing.push('Emergency Contact Relationship')
    if (!emergencyContact?.phone) missing.push('Emergency Contact Phone')
    if (!personal?.declarationAccurate || !personal?.declarationWillNotify) missing.push('Declaration')
    if (missing.length) return fail(`Please complete: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR')

    personal.declaredAt = new Date()
    await personal.save()

    preboarding.formStatus = FORM_STATUS.SUBMITTED
    preboarding.formSubmittedAt = new Date()
    preboarding.correctionRequest = null
    preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: 'Candidate submitted the information form' })
    await preboarding.save()

    return ok(null, 'Information submitted')
  })
})
