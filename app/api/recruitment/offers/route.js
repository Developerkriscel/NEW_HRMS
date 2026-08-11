export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { OFFER_VIEW_ROLES, OFFER_STATUS_LABELS } from '@/lib/offerConstants'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'

// GET — item 1's /hr/recruitment/offers table: Candidate/Job/Proposed CTC/
// Joining Date/Offer Version/Status/Created By/Sent Date/Expiry.
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const query = { tenantId, deleted: false }
  if (status) query.status = status

  let offers = await Offer.find(query)
    .populate('candidateId', 'firstName lastName candidateCode')
    .populate('jobId', 'jobCode jobTitle publicTitle')
    .sort({ updatedAt: -1 })

  if (search) {
    const term = search.toLowerCase()
    offers = offers.filter((o) => {
      const name = o.candidateId ? `${o.candidateId.firstName} ${o.candidateId.lastName}`.toLowerCase() : ''
      return name.includes(term) || o.offerCode?.toLowerCase().includes(term)
    })
  }

  const totalElements = offers.length
  const pageOffers = offers.slice(page * size, page * size + size)
  const versions = await OfferVersion.find({ tenantId, _id: { $in: pageOffers.map((o) => o.currentVersionId).filter(Boolean) } })
    .select('offerId version ctc joiningDate')
    .lean()
  const versionByOffer = new Map(versions.map((v) => [String(v.offerId), v]))

  const rows = pageOffers.map((o) => {
    const v = versionByOffer.get(String(o._id))
    return {
      offerId: o._id,
      offerCode: o.offerCode,
      candidateId: o.candidateId?._id,
      candidateName: o.candidateId ? `${o.candidateId.firstName} ${o.candidateId.lastName}` : null,
      jobId: o.jobId?._id,
      jobTitle: o.jobId?.publicTitle || o.jobId?.jobTitle,
      proposedCtc: v?.ctc ?? null,
      joiningDate: v?.joiningDate ?? null,
      version: v?.version ?? null,
      status: o.status,
      statusLabel: OFFER_STATUS_LABELS[o.status] || o.status,
      createdByName: o.createdByName,
      sentAt: o.sentAt,
      expiresAt: o.expiresAt,
    }
  })

  return ok(paged(rows, page, size, totalElements))
})
