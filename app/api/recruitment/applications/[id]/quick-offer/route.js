export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { OFFER_STATUS, OFFER_VERSION_STATUS, OFFER_VIEW_ROLES, canManageOffers } from '@/lib/offerConstants'
import { generateOfferCode } from '@/lib/offerHelpers'
import { issueOfferToken, revokeOfferTokens } from '@/lib/offerTokenHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import Application from '@/models/Application'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'

function addDays(days) {
  return new Date(Date.now() + days * 86400000)
}

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to send this offer', 403, 'FORBIDDEN')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false }).populate('candidateId').populate('jobId')
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const candidate = application.candidateId
  const job = application.jobId
  const joiningDate = body.joiningDate ? new Date(body.joiningDate) : addDays(30)
  const offerValidUntil = body.offerValidUntil ? new Date(body.offerValidUntil) : addDays(7)
  const ctc = Number(body.ctc || candidate?.expectedCtc || candidate?.currentCtc || job?.publicMinCtc || job?.internalMinCtc || 1)
  const actorName = await getActorName(session)

  let offer = await Offer.findOne({ tenantId, applicationId: application._id, deleted: false })
  if (!offer) {
    offer = await Offer.create({
      tenantId,
      offerCode: await generateOfferCode(tenantId),
      applicationId: application._id,
      candidateId: candidate._id,
      jobId: job._id,
      status: OFFER_STATUS.DRAFT,
      createdBy: session.userId,
      createdByName: actorName,
    })
  }

  const version = await OfferVersion.create({
    tenantId,
    offerId: offer._id,
    applicationId: application._id,
    candidateId: candidate._id,
    jobId: job._id,
    version: 1,
    designationId: job.designation || null,
    departmentId: job.department || null,
    managerId: job.hiringManager || null,
    joiningDate,
    locationId: job.location || null,
    employmentType: job.employmentType || null,
    workMode: job.workMode || null,
    ctc,
    salaryStructureId: null,
    probationPeriod: '6 months',
    noticePeriod: candidate.noticePeriod || '30 days',
    offerValidUntil,
    templateId: null,
    renderedContent: body.body || `Offer for ${candidate.getFullName?.() || candidate.firstName} - ${job.publicTitle || job.jobTitle}`,
    status: OFFER_VERSION_STATUS.APPROVED,
    createdBy: session.userId,
    createdByName: actorName,
    approvedBy: session.userId,
    approvedByName: actorName,
    approvedAt: new Date(),
  })

  await revokeOfferTokens(tenantId, offer._id)
  const token = await issueOfferToken(tenantId, offer._id, offerValidUntil)

  offer.currentVersionId = version._id
  offer.status = OFFER_STATUS.SENT
  offer.sentAt = new Date()
  offer.expiresAt = offerValidUntil
  offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Quick offer sent by ${actorName}`, actorName })
  await offer.save()

  application.readyForOffer = true
  application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer sent by ${actorName}`, actorName })
  await application.save()

  await logAction(session, {
    action: 'OFFER_SENT',
    entityType: 'Offer',
    entityId: offer._id,
    description: `Quick offer sent for ${application.applicationCode}`,
    req,
  })

  return ok({ offer, version, portalUrl: `/candidate/offer/${token}` }, 'Offer sent', 201)
})
