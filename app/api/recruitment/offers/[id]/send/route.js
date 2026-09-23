export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers, OFFER_STATUS, OFFER_VERSION_STATUS } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { issueOfferToken, revokeOfferTokens } from '@/lib/offerTokenHelpers'
import { ensureOfferPdf, sendOfferEmail } from '@/lib/offerEmailDelivery'
import { assertTenantMailReady } from '@/lib/tenantMail'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import '@/models/Candidate'
import '@/models/Job'

// POST — "[Send Offer]" (Step 14 item). There's no email infra in this
// codebase (same honest limitation as every prior step's "Send" action —
// see assign-assessment/route.js) — this marks the offer SENT and issues a
// fresh secure link immediately rather than actually delivering anything;
// the link itself is returned so HR can copy/share it. Any link issued for
// an earlier send is revoked so only the latest one works.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to send this offer', 403, 'FORBIDDEN')

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false }).populate('candidateId').populate('jobId')
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')
  const version = await OfferVersion.findOne({ _id: offer.currentVersionId, tenantId })
  if (!version || version.status !== OFFER_VERSION_STATUS.APPROVED) {
    return fail('Only an approved offer can be sent', 400, 'INVALID_STATE')
  }
  const reqBody = await req.json().catch(() => ({}))
  if (!offer.candidateId?.email && !reqBody.candidateEmail) return fail('Candidate email is missing. Add candidate email before sending an offer.', 400, 'VALIDATION_ERROR')
  await assertTenantMailReady(tenantId)

  const actorName = await getActorName(session)
  await revokeOfferTokens(tenantId, offer._id)
  const token = await issueOfferToken(tenantId, offer._id, version.offerValidUntil)
  const portalUrl = `/candidate/offer/${token}`
  await ensureOfferPdf({ tenantId, offer, version })

  try {
    await sendOfferEmail({
      tenantId,
      candidate: offer.candidateId,
      job: offer.jobId,
      version,
      offer,
      portalUrl,
      subject: reqBody?.subject || null,
      body: reqBody?.body || null,
      candidateEmail: reqBody?.candidateEmail || null,
    })
  } catch (err) {
    await revokeOfferTokens(tenantId, offer._id)
    throw err
  }

  offer.status = OFFER_STATUS.SENT
  offer.sentAt = new Date()
  offer.expiresAt = version.offerValidUntil
  offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer V${version.version} sent to candidate by ${actorName}`, actorName })
  await offer.save()

  await logAction(session, { action: 'OFFER_SENT', entityType: 'Offer', entityId: offer._id, description: `Offer V${version.version} sent`, req })

  return ok({ offer, portalUrl }, 'Offer sent')
})
