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
import { PIPELINE_STAGE_CATEGORY } from '@/lib/jobConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { applyStageMove, recordStageHistory } from '@/lib/pipelineHelpers'
import { saveOfferAttachment, validateOfferAttachment } from '@/lib/offerStorage'
import { ensureOfferPdf, sendOfferEmail } from '@/lib/offerEmailDelivery'
import { assertTenantMailReady } from '@/lib/tenantMail'
import Application from '@/models/Application'
import JobPipelineStage from '@/models/JobPipelineStage'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import '@/models/Candidate'
import '@/models/Job'

function addDays(days) {
  return new Date(Date.now() + days * 86400000)
}

function pickOfferStage(stages) {
  const active = (stages || []).filter((stage) => stage.isActive !== false)
  return active.find((stage) => /^offered?$/i.test(String(stage.name || '').trim()))
    || active.find((stage) => /offer/i.test(String(stage.name || '')))
    || active.find((stage) => stage.category === PIPELINE_STAGE_CATEGORY.OFFER)
    || null
}

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const contentType = req.headers.get('content-type') || ''
  let body = {}
  let attachmentFiles = []
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    body = {
      subject: formData.get('subject') || undefined,
      body: formData.get('body') || undefined,
      candidateEmail: formData.get('candidateEmail') || undefined,
      joiningDate: formData.get('joiningDate') || undefined,
      offerValidUntil: formData.get('offerValidUntil') || undefined,
      ctc: formData.get('ctc') || undefined,
    }
    attachmentFiles = formData.getAll('attachments').filter((file) => file && typeof file !== 'string' && file.size > 0)
  } else {
    body = await req.json().catch(() => ({}))
  }

  if (!canManageOffers(session)) return fail('You do not have permission to send this offer', 403, 'FORBIDDEN')
  if (attachmentFiles.length > 5) return fail('You can attach up to 5 PDF files with an offer letter', 400, 'VALIDATION_ERROR')

  for (const file of attachmentFiles) {
    const validationError = validateOfferAttachment(file)
    if (validationError) return fail(validationError, 400, 'VALIDATION_ERROR')
  }

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false }).populate('candidateId').populate('jobId')
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const candidate = application.candidateId
  const job = application.jobId
  if (!candidate?.email && !body.candidateEmail) return fail('Candidate email is missing. Add candidate email before sending an offer.', 400, 'VALIDATION_ERROR')
  await assertTenantMailReady(tenantId)
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

  const nextVersion = (await OfferVersion.countDocuments({ tenantId, offerId: offer._id, deleted: false })) + 1
  const attachments = []
  for (const file of attachmentFiles) {
    attachments.push(await saveOfferAttachment(file, tenantId, offer.offerCode))
  }

  const version = await OfferVersion.create({
    tenantId,
    offerId: offer._id,
    applicationId: application._id,
    candidateId: candidate._id,
    jobId: job._id,
    version: nextVersion,
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
    attachments,
    status: OFFER_VERSION_STATUS.APPROVED,
    createdBy: session.userId,
    createdByName: actorName,
    approvedBy: session.userId,
    approvedByName: actorName,
    approvedAt: new Date(),
  })

  await revokeOfferTokens(tenantId, offer._id)
  const token = await issueOfferToken(tenantId, offer._id, offerValidUntil)
  const portalUrl = `/candidate/offer/${token}`
  await ensureOfferPdf({ tenantId, offer, version })

  try {
    await sendOfferEmail({
      tenantId,
      candidate,
      job,
      version,
      offer,
      portalUrl,
      subject: body.subject,
      body: body.body,
      candidateEmail: body.candidateEmail,
    })
  } catch (err) {
    await revokeOfferTokens(tenantId, offer._id)
    throw err
  }

  offer.currentVersionId = version._id
  offer.status = OFFER_STATUS.SENT
  offer.sentAt = new Date()
  offer.expiresAt = offerValidUntil
  offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Quick offer sent by ${actorName}`, actorName })
  await offer.save()

  const stages = await JobPipelineStage.find({ tenantId, jobId: job._id, isActive: true }).sort({ order: 1 })
  const offerStage = pickOfferStage(stages)
  let movedStage = null
  let fromStageId = null
  let fromStageName = null
  if (offerStage && String(application.currentStage) !== String(offerStage._id)) {
    const move = applyStageMove(application, offerStage, { comment: 'Offer sent from recruitment board', actorName })
    fromStageId = move.fromStageId
    fromStageName = move.fromStageName
    movedStage = offerStage
  }

  application.readyForOffer = true
  application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer sent by ${actorName}`, actorName })
  await application.save()

  if (movedStage) {
    await recordStageHistory({
      tenantId,
      application,
      fromStageId,
      toStageId: movedStage._id,
      fromStageName,
      toStageName: movedStage.name,
      action: STAGE_HISTORY_ACTION.MOVED,
      comment: 'Offer sent from recruitment board',
      session,
    })
  }

  await logAction(session, {
    action: 'OFFER_SENT',
    entityType: 'Offer',
    entityId: offer._id,
    description: `Quick offer sent for ${application.applicationCode}`,
    req,
  })

  return ok({
    offer,
    version,
    stage: movedStage ? { _id: movedStage._id, name: movedStage.name, category: movedStage.category } : null,
    application,
    portalUrl,
  }, 'Offer sent', 201)
})
