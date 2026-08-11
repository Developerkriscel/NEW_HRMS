export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requestIp, requestUserAgent } from '@/lib/auth'
import { runForTenant } from '@/lib/tenantDb'
import { resolveOfferTokenClaims } from '@/lib/offerTokenHelpers'
import { loadOfferByToken } from '@/lib/offerHelpers'
import { OFFER_STATUS, OFFER_CANDIDATE_ACTION } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import OfferCandidateAction from '@/models/OfferCandidateAction'
import Application from '@/models/Application'

const DISCUSSABLE = [OFFER_STATUS.SENT, OFFER_STATUS.VIEWED]

// POST { expectedCtc?, preferredJoiningDate?, comment } — "Do not force
// candidate to decline if they only want different terms." Offer status is
// deliberately left as-is ("Offer remains under discussion" — there's no
// dedicated status for it in the spec's own enum); HR sees the request and
// can generate a new version (Step 13 versioning) from here.
export const POST = withApi(async (req, { params }) => {
  const claims = await resolveOfferTokenClaims(params.token)
  if (!claims) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')
  const body = await req.json().catch(() => ({}))

  if (!body.comment?.trim() && !body.expectedCtc && !body.preferredJoiningDate) {
    return fail('Please share at least a comment, expected CTC, or preferred joining date', 400, 'VALIDATION_ERROR')
  }

  return runForTenant(claims.tenant, async () => {
    const loaded = await loadOfferByToken(claims.tenant._id, claims.offerId, claims.jti)
    if (!loaded) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')
    const { offer } = loaded
    if (!DISCUSSABLE.includes(offer.status)) {
      return fail(`Discussion cannot be requested on an offer that is ${offer.status.toLowerCase()}`, 400, 'INVALID_STATE')
    }

    offer.discussionRequestedAt = new Date()
    offer.discussionRequestedCtc = body.expectedCtc != null ? Number(body.expectedCtc) : null
    offer.discussionRequestedJoiningDate = body.preferredJoiningDate ? new Date(body.preferredJoiningDate) : null
    offer.discussionComment = body.comment || null
    offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.NOTE, message: 'Candidate requested a discussion on offer terms', comment: body.comment })
    await offer.save()

    await OfferCandidateAction.create({
      tenantId: claims.tenant._id, offerId: offer._id, action: OFFER_CANDIDATE_ACTION.DISCUSSION_REQUEST,
      comment: body.comment || null, requestedCtc: offer.discussionRequestedCtc, requestedJoiningDate: offer.discussionRequestedJoiningDate,
      ipAddress: requestIp(req), userAgent: requestUserAgent(req),
    })

    const application = await Application.findOne({ _id: offer.applicationId, tenantId: claims.tenant._id, deleted: false })
    if (application) {
      application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.NOTE, message: 'Candidate requested a discussion on their offer terms' })
      await application.save()
    }

    return ok({ status: offer.status }, 'Discussion request sent to HR')
  })
})
