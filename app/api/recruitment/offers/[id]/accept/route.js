export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, requestIp, requestUserAgent } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_STATUS, OFFER_MANAGE_ROLES, OFFER_CANDIDATE_ACTION, canManageOffers } from '@/lib/offerConstants'
import { createPreboardingRecord } from '@/lib/offerHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import Application from '@/models/Application'
import OfferCandidateAction from '@/models/OfferCandidateAction'

const ACCEPTABLE = [OFFER_STATUS.SENT, OFFER_STATUS.VIEWED]

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to accept this offer', 403, 'FORBIDDEN')

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
  if (!offer) return fail('Offer not found', 404, 'NOT_FOUND')
  if (!ACCEPTABLE.includes(offer.status)) {
    return fail(`This offer cannot be accepted (currently ${offer.status.toLowerCase()})`, 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  const acceptedName = body.fullName?.trim() || actorName
  const version = offer.currentVersionId
    ? await OfferVersion.findOne({ _id: offer.currentVersionId, tenantId, deleted: false })
    : await OfferVersion.findOne({ offerId: offer._id, tenantId, deleted: false }).sort({ version: -1 })

  offer.status = OFFER_STATUS.ACCEPTED
  offer.acceptedAt = new Date()
  offer.acceptedName = acceptedName
  offer.signatureReference = `HR-SIG-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
  offer.acceptedIp = requestIp(req)
  offer.acceptedUserAgent = requestUserAgent(req)
  offer.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
    message: `Offer marked accepted by ${actorName}`,
    comment: body.comment || null,
    actorName,
  })
  await offer.save()

  await OfferCandidateAction.create({
    tenantId,
    offerId: offer._id,
    action: OFFER_CANDIDATE_ACTION.ACCEPT,
    comment: body.comment || 'Marked accepted by HR',
    ipAddress: requestIp(req),
    userAgent: requestUserAgent(req),
  })

  const application = await Application.findOne({ _id: offer.applicationId, tenantId, deleted: false })
  let preboarding = null
  if (application && version) {
    application.activityLog.push({
      type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
      message: `Offer accepted — moved to preboarding`,
      comment: body.comment || null,
      actorName,
    })
    await application.save()
    preboarding = await createPreboardingRecord(tenantId, { application, offer, version })
  }

  await logAction(session, {
    action: 'OFFER_ACCEPTED_BY_HR',
    entityType: 'Offer',
    entityId: offer._id,
    description: `Offer ${offer.offerCode} marked accepted by HR`,
    req,
  })

  return ok({ offer, preboardingCreated: !!preboarding }, 'Offer accepted')
})
