export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canApproveOffer, OFFER_STATUS, OFFER_VERSION_STATUS, OFFER_APPROVAL_STATUS } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import OfferApproval from '@/models/OfferApproval'
import Job from '@/models/Job'

// POST { comment } — item 9: revision requires a comment. Unlike Reject,
// this is framed as "close, just fix X" — HR edits straight from here
// (the offer stays visible/editable once its version flips to
// REVISION_REQUESTED, same as CompensationProposal's flow).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.comment?.trim()) return fail('A comment is required when requesting a revision', 400, 'VALIDATION_ERROR')

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')
  const version = await OfferVersion.findOne({ _id: offer.currentVersionId, tenantId })
  if (!version || version.status !== OFFER_VERSION_STATUS.PENDING_APPROVAL) {
    return fail('This offer is not pending approval', 400, 'INVALID_STATE')
  }

  const job = await Job.findOne({ _id: offer.jobId, tenantId, deleted: false })
  if (!canApproveOffer(session, job)) return fail('You do not have permission to act on this offer', 403, 'FORBIDDEN')

  const actorName = await getActorName(session)
  version.status = OFFER_VERSION_STATUS.REVISION_REQUESTED
  version.revisionComment = body.comment.trim()
  await version.save()

  offer.status = OFFER_STATUS.REVISION_REQUESTED
  offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Revision requested on Offer V${version.version} by ${actorName} — ${body.comment.trim()}`, actorName })
  await offer.save()

  await OfferApproval.findOneAndUpdate(
    { tenantId, offerVersionId: version._id },
    { status: OFFER_APPROVAL_STATUS.REVISION_REQUESTED, approverId: session.userId, approverName: actorName, comment: body.comment.trim(), actedAt: new Date() },
    { upsert: true }
  )

  await logAction(session, { action: 'OFFER_REVISION_REQUESTED', entityType: 'Offer', entityId: offer._id, description: `Revision requested on offer V${version.version}`, req })

  return ok({ offer, version }, 'Revision requested')
})
