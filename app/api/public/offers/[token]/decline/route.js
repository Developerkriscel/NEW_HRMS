export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requestIp, requestUserAgent } from '@/lib/auth'
import { runForTenant } from '@/lib/tenantDb'
import { resolveOfferTokenClaims } from '@/lib/offerTokenHelpers'
import { loadOfferByToken } from '@/lib/offerHelpers'
import { OFFER_STATUS, OFFER_CANDIDATE_ACTION, OFFER_DECLINE_REASONS } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import OfferCandidateAction from '@/models/OfferCandidateAction'
import Application from '@/models/Application'

const DECLINABLE = [OFFER_STATUS.SENT, OFFER_STATUS.VIEWED]

// POST { reason, comment? } — reason is mandatory, from a fixed list.
export const POST = withApi(async (req, { params }) => {
  const claims = await resolveOfferTokenClaims(params.token)
  if (!claims) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')
  const body = await req.json().catch(() => ({}))

  if (!body.reason || !OFFER_DECLINE_REASONS.includes(body.reason)) return fail('A valid decline reason is required', 400, 'VALIDATION_ERROR')

  return runForTenant(claims.tenant, async () => {
    const loaded = await loadOfferByToken(claims.tenant._id, claims.offerId, claims.jti)
    if (!loaded) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')
    const { offer } = loaded
    if (!DECLINABLE.includes(offer.status)) {
      return fail(`This offer cannot be declined (currently ${offer.status.toLowerCase()})`, 400, 'INVALID_STATE')
    }

    offer.status = OFFER_STATUS.DECLINED
    offer.declinedAt = new Date()
    offer.declineReason = body.reason
    offer.declineComment = body.comment || null
    offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer declined by candidate — ${body.reason}`, comment: body.comment })
    await offer.save()

    await OfferCandidateAction.create({
      tenantId: claims.tenant._id, offerId: offer._id, action: OFFER_CANDIDATE_ACTION.DECLINE,
      reason: body.reason, comment: body.comment || null,
      ipAddress: requestIp(req), userAgent: requestUserAgent(req),
    })

    const application = await Application.findOne({ _id: offer.applicationId, tenantId: claims.tenant._id, deleted: false })
    if (application) {
      application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer declined by candidate — ${body.reason}` })
      await application.save()
    }

    return ok({ status: offer.status }, 'Offer declined')
  })
})
