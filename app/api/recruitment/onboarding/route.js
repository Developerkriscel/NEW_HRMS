export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_VIEW_ROLES, PREBOARDING_STATUS, PREBOARDING_STATUS_LIST, FORM_STATUS_LABELS, canManagePreboarding } from '@/lib/preboardingConstants'
import { OFFER_STATUS } from '@/lib/offerConstants'
import { createPreboardingRecord } from '@/lib/offerHelpers'
import Preboarding from '@/models/Preboarding'
import CandidateDocument from '@/models/CandidateDocument'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import Application from '@/models/Application'
import '@/models/Job'
import { buildPreboardingMilestones } from '@/lib/preboardingMilestones'
import Candidate from '@/models/Candidate'

// GET ?status=<tab> — item 1's Preboarding Dashboard: 8 tabs, 6 summary
// cards, and the candidate table (item 3: "Show preboarding progress and
// joining dates").
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 100)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const weekFromNow = new Date(Date.now() + 7 * 86400000)
  const now = new Date()
  const baseQuery = { tenantId, deleted: false }
  const query = { ...baseQuery }
  if (status) query.status = status
  if (search) {
    const term = String(search).trim()
    const matchingCandidates = await Candidate.find({
      tenantId,
      deleted: false,
      $or: [
        { firstName: { $regex: term, $options: 'i' } },
        { lastName: { $regex: term, $options: 'i' } },
        { candidateCode: { $regex: term, $options: 'i' } },
      ],
    }).select('_id').lean()
    query.candidateId = { $in: matchingCandidates.map((candidate) => candidate._id) }
  }

  const [
    totalElements,
    pageRows,
    statusCounts,
    acceptedOffers,
    joiningThisWeek,
  ] = await Promise.all([
    Preboarding.countDocuments(query),
    Preboarding.find(query)
      .populate('candidateId', 'firstName lastName candidateCode')
      .populate('jobId', 'jobTitle publicTitle')
      .sort({ proposedJoiningDate: 1 })
      .skip(page * size)
      .limit(size),
    Preboarding.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Preboarding.countDocuments(baseQuery),
    Preboarding.countDocuments({
      ...baseQuery,
      status: { $nin: [PREBOARDING_STATUS.JOINED, PREBOARDING_STATUS.NO_SHOW, PREBOARDING_STATUS.CANCELLED] },
      $or: [
        { confirmedJoiningDate: { $gte: now, $lte: weekFromNow } },
        { confirmedJoiningDate: null, proposedJoiningDate: { $gte: now, $lte: weekFromNow } },
      ],
    }),
  ])

  const tabCounts = Object.fromEntries(PREBOARDING_STATUS_LIST.map((item) => [item, 0]))
  for (const item of statusCounts) tabCounts[item._id] = item.count

  const cards = {
    acceptedOffers,
    formsPending: tabCounts[PREBOARDING_STATUS.INFORMATION_PENDING] || 0,
    documentsPending: tabCounts[PREBOARDING_STATUS.DOCUMENTS_PENDING] || 0,
    verificationPending: tabCounts[PREBOARDING_STATUS.VERIFICATION_PENDING] || 0,
    readyToJoin: tabCounts[PREBOARDING_STATUS.READY_TO_JOIN] || 0,
    joiningThisWeek,
  }

  const ids = pageRows.map((p) => p._id)
  const [docs, versions] = await Promise.all([
    CandidateDocument.find({ tenantId, preboardingId: { $in: ids }, deleted: false }).select('preboardingId isRequired status').lean(),
    OfferVersion.find({ tenantId, _id: { $in: pageRows.map((p) => p.offerVersionId).filter(Boolean) }, deleted: false }).lean(),
  ])
  const versionById = new Map(versions.map((version) => [String(version._id), version]))
  const docsByPreboarding = new Map()
  for (const d of docs) {
    const key = String(d.preboardingId)
    if (!docsByPreboarding.has(key)) docsByPreboarding.set(key, [])
    docsByPreboarding.get(key).push(d)
  }
  const rows = pageRows.map((p) => {
    const pDocs = (docsByPreboarding.get(String(p._id)) || []).filter((d) => d.isRequired)
    const uploaded = pDocs.filter((d) => d.status !== 'NOT_UPLOADED').length
    const verified = pDocs.filter((d) => ['VERIFIED', 'WAIVED'].includes(d.status)).length
    const version = versionById.get(String(p.offerVersionId)) || {}
    const milestoneState = buildPreboardingMilestones({
      ...p.toObject(),
      documents: docsByPreboarding.get(String(p._id)) || [],
      offer: version,
      departmentId: version.departmentId,
      designationId: version.designationId,
      locationId: version.locationId,
      shiftId: version.shiftId,
      reportingManager: version.managerId,
      ctc: version.ctc,
    })
    return {
      preboardingId: p._id,
      offerId: p.offerId,
      candidateId: p.candidateId?._id,
      candidateName: p.candidateId ? `${p.candidateId.firstName} ${p.candidateId.lastName}` : null,
      jobTitle: p.jobId?.publicTitle || p.jobId?.jobTitle,
      joiningDate: p.confirmedJoiningDate || p.proposedJoiningDate,
      formStatus: p.formStatus,
      formStatusLabel: FORM_STATUS_LABELS[p.formStatus] || p.formStatus,
      documentsPercent: pDocs.length ? Math.round((uploaded / pDocs.length) * 100) : null,
      verificationStatus: p.verificationStatus,
      verified, documentsRequired: pDocs.length,
      progressPercentage: p.progressPercentage ?? milestoneState.progress,
      tasks: milestoneState.milestones.map((task) => ({
        ...task,
        assignedTo: 'System',
        dueDate: p.confirmedJoiningDate || p.proposedJoiningDate,
        systemGenerated: true,
      })),
      status: p.status,
      conversionStatus: p.conversionStatus,
      convertedEmployeeId: p.convertedEmployeeId,
    }
  })

  return ok({ ...paged(rows, page, size, totalElements), cards, tabCounts })
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  if (!canManagePreboarding(session)) return fail('You do not have permission to start onboarding', 403, 'FORBIDDEN')

  const body = await req.json()
  if (!body.offerId) return fail('Offer is required to start onboarding', 400, 'VALIDATION_ERROR')

  const offer = await Offer.findOne({ _id: body.offerId, tenantId, deleted: false })
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')
  if (offer.status !== OFFER_STATUS.ACCEPTED) return fail('Only accepted offers can move to onboarding', 400, 'INVALID_STATE')

  const [version, application] = await Promise.all([
    offer.currentVersionId
      ? OfferVersion.findOne({ _id: offer.currentVersionId, tenantId, deleted: false })
      : OfferVersion.findOne({ offerId: offer._id, tenantId, deleted: false }).sort({ version: -1 }),
    Application.findOne({ _id: offer.applicationId, tenantId, deleted: false }),
  ])
  if (!version) throw new ApiError(404, 'Offer version not found', 'NOT_FOUND')
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const preboarding = await createPreboardingRecord(tenantId, { application, offer, version })
  return ok(preboarding, 'Onboarding profile ready', 201)
})
