export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requestIp, requestUserAgent } from '@/lib/auth'
import { runForTenant } from '@/lib/tenantDb'
import { resolveOfferTokenClaims } from '@/lib/offerTokenHelpers'
import { loadOfferByToken, createPreboardingRecord } from '@/lib/offerHelpers'
import { OFFER_STATUS, OFFER_CANDIDATE_ACTION } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import OfferCandidateAction from '@/models/OfferCandidateAction'
import Application from '@/models/Application'

const ACCEPTABLE = [OFFER_STATUS.SENT, OFFER_STATUS.VIEWED]

// POST { fullName, accepted } — item 5's digital acknowledgement.
// Deliberately not a real e-sign integration: `signatureReference` is a
// self-contained placeholder id so a formal provider (DocuSign etc.) can
// slot in later without a schema change. Immediately creates the
// Preboarding handoff record — "Do NOT create Employee Master yet."
export const POST = withApi(async (req, { params }) => {
  const claims = await resolveOfferTokenClaims(params.token)
  if (!claims) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')
  const body = await req.json().catch(() => ({}))

  if (!body.fullName?.trim()) return fail('Your full name is required', 400, 'VALIDATION_ERROR')
  if (!body.accepted) return fail('You must confirm acceptance of the offer terms', 400, 'VALIDATION_ERROR')

  return runForTenant(claims.tenant, async () => {
    const loaded = await loadOfferByToken(claims.tenant._id, claims.offerId, claims.jti)
    if (!loaded) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')
    const { offer, version } = loaded
    if (!ACCEPTABLE.includes(offer.status)) {
      return fail(`This offer cannot be accepted (currently ${offer.status.toLowerCase()})`, 400, 'INVALID_STATE')
    }

    const signatureReference = `SIG-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
    offer.status = OFFER_STATUS.ACCEPTED
    offer.acceptedAt = new Date()
    offer.acceptedName = body.fullName.trim()
    offer.signatureReference = signatureReference
    offer.acceptedIp = requestIp(req)
    offer.acceptedUserAgent = requestUserAgent(req)
    offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer accepted by ${body.fullName.trim()}` })
    await offer.save()

    await OfferCandidateAction.create({
      tenantId: claims.tenant._id, offerId: offer._id, action: OFFER_CANDIDATE_ACTION.ACCEPT,
      ipAddress: requestIp(req), userAgent: requestUserAgent(req),
    })

    const application = await Application.findOne({ _id: offer.applicationId, tenantId: claims.tenant._id, deleted: false })
    let preboarding = null
    if (application) {
      application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer accepted by ${body.fullName.trim()} — moved to preboarding` })
      await application.save()
      preboarding = await createPreboardingRecord(claims.tenant._id, { application, offer, version })
    }

    return ok({ status: offer.status, preboardingCreated: !!preboarding }, 'Offer accepted')
  })
})
