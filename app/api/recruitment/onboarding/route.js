export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_VIEW_ROLES, PREBOARDING_STATUS, PREBOARDING_STATUS_LIST, FORM_STATUS_LABELS, canManagePreboarding } from '@/lib/preboardingConstants'
import { OFFER_STATUS } from '@/lib/offerConstants'
import { createPreboardingRecord } from '@/lib/offerHelpers'
import Preboarding from '@/models/Preboarding'
import CandidateDocument from '@/models/CandidateDocument'
import PreboardingTask from '@/models/PreboardingTask'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import Application from '@/models/Application'

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

  const all = await Preboarding.find({ tenantId, deleted: false })
    .populate('candidateId', 'firstName lastName candidateCode')
    .populate('jobId', 'jobTitle publicTitle')
    .sort({ proposedJoiningDate: 1 })

  const tabCounts = {}
  for (const s of PREBOARDING_STATUS_LIST) tabCounts[s] = 0
  for (const p of all) tabCounts[p.status] = (tabCounts[p.status] || 0) + 1

  const weekFromNow = new Date(Date.now() + 7 * 86400000)
  const cards = {
    acceptedOffers: all.length,
    formsPending: tabCounts[PREBOARDING_STATUS.INFORMATION_PENDING] || 0,
    documentsPending: tabCounts[PREBOARDING_STATUS.DOCUMENTS_PENDING] || 0,
    verificationPending: tabCounts[PREBOARDING_STATUS.VERIFICATION_PENDING] || 0,
    readyToJoin: tabCounts[PREBOARDING_STATUS.READY_TO_JOIN] || 0,
    joiningThisWeek: all.filter((p) => {
      const d = p.confirmedJoiningDate || p.proposedJoiningDate
      return d && new Date(d) <= weekFromNow && new Date(d) >= new Date() && ![PREBOARDING_STATUS.JOINED, PREBOARDING_STATUS.NO_SHOW, PREBOARDING_STATUS.CANCELLED].includes(p.status)
    }).length,
  }

  let filtered = status ? all.filter((p) => p.status === status) : all
  if (search) {
    const term = search.toLowerCase()
    filtered = filtered.filter((p) => {
      const name = p.candidateId ? `${p.candidateId.firstName} ${p.candidateId.lastName}`.toLowerCase() : ''
      return name.includes(term)
    })
  }

  const totalElements = filtered.length
  const pageRows = filtered.slice(page * size, page * size + size)
  const ids = pageRows.map((p) => p._id)
  const [docs, tasks] = await Promise.all([
    CandidateDocument.find({ tenantId, preboardingId: { $in: ids }, deleted: false }).select('preboardingId isRequired status').lean(),
    PreboardingTask.find({ tenantId, preboardingId: { $in: ids }, deleted: false }).select('preboardingId name assignedTo dueDate priority required status').lean(),
  ])
  const docsByPreboarding = new Map()
  for (const d of docs) {
    const key = String(d.preboardingId)
    if (!docsByPreboarding.has(key)) docsByPreboarding.set(key, [])
    docsByPreboarding.get(key).push(d)
  }
  const tasksByPreboarding = new Map()
  for (const task of tasks) {
    const key = String(task.preboardingId)
    if (!tasksByPreboarding.has(key)) tasksByPreboarding.set(key, [])
    tasksByPreboarding.get(key).push(task)
  }

  const rows = pageRows.map((p) => {
    const pDocs = (docsByPreboarding.get(String(p._id)) || []).filter((d) => d.isRequired)
    const uploaded = pDocs.filter((d) => d.status !== 'NOT_UPLOADED').length
    const verified = pDocs.filter((d) => ['VERIFIED', 'WAIVED'].includes(d.status)).length
    return {
      preboardingId: p._id,
      candidateId: p.candidateId?._id,
      candidateName: p.candidateId ? `${p.candidateId.firstName} ${p.candidateId.lastName}` : null,
      jobTitle: p.jobId?.publicTitle || p.jobId?.jobTitle,
      joiningDate: p.confirmedJoiningDate || p.proposedJoiningDate,
      formStatus: p.formStatus,
      formStatusLabel: FORM_STATUS_LABELS[p.formStatus] || p.formStatus,
      documentsPercent: pDocs.length ? Math.round((uploaded / pDocs.length) * 100) : null,
      verificationStatus: p.verificationStatus,
      verified, documentsRequired: pDocs.length,
      tasks: tasksByPreboarding.get(String(p._id)) || [],
      status: p.status,
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
