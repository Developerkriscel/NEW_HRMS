export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requestIp, requestUserAgent } from '@/lib/auth'
import { runForTenant } from '@/lib/tenantDb'
import { resolveOfferTokenClaims } from '@/lib/offerTokenHelpers'
import { loadOfferByToken } from '@/lib/offerHelpers'
import { OFFER_STATUS, OFFER_CANDIDATE_ACTION } from '@/lib/offerConstants'
import OfferCandidateAction from '@/models/OfferCandidateAction'

// POST — "When opened: SENT -> VIEWED. Store viewedAt." Fired once by the
// portal page on load; idempotent (a second view doesn't overwrite the
// first viewedAt or re-log a duplicate VIEW action needlessly — though a
// fresh VIEW row per open is harmless and arguably useful for HR, so this
// intentionally does still log every open, just doesn't reset viewedAt).
export const POST = withApi(async (req, { params }) => {
  const claims = await resolveOfferTokenClaims(params.token)
  if (!claims) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')

  return runForTenant(claims.tenant, async () => {
    const loaded = await loadOfferByToken(claims.tenant._id, claims.offerId, claims.jti)
    if (!loaded) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')
    const { offer } = loaded

    if (offer.status === OFFER_STATUS.SENT) {
      offer.status = OFFER_STATUS.VIEWED
      offer.viewedAt = new Date()
      offer.activityLog.push({ type: 'STATUS_CHANGED', message: 'Candidate viewed the offer' })
      await offer.save()
    }

    await OfferCandidateAction.create({
      tenantId: claims.tenant._id, offerId: offer._id, action: OFFER_CANDIDATE_ACTION.VIEW,
      ipAddress: requestIp(req), userAgent: requestUserAgent(req),
    })

    return ok({ status: offer.status })
  })
})
