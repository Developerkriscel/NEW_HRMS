export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolveOfferTokenClaims } from '@/lib/offerTokenHelpers'
import { loadOfferByToken } from '@/lib/offerHelpers'
import { OFFER_STATUS } from '@/lib/offerConstants'
import Designation from '@/models/Designation'
import Department from '@/models/Department'
import Employee from '@/models/Employee'
import Branch from '@/models/Branch'

const INACTIVE = [OFFER_STATUS.WITHDRAWN, OFFER_STATUS.EXPIRED, OFFER_STATUS.DECLINED]

// GET — the candidate landing screen's data. Deliberately a narrow,
// candidate-safe projection: no internal HR notes, internal approval
// history, or budget/compensation-band details — just what the spec's
// "Congratulations, {{name}}..." screen actually shows.
export const GET = withApi(async (req, { params }) => {
  const claims = await resolveOfferTokenClaims(params.token)
  if (!claims) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')

  return runForTenant(claims.tenant, async () => {
    const loaded = await loadOfferByToken(claims.tenant._id, claims.offerId, claims.jti)
    if (!loaded) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')
    const { offer, version } = loaded
    if (!version) return fail('This offer is not available', 404, 'NOT_FOUND')

    const candidate = offer.candidateId
    const job = offer.jobId

    const [designation, department, manager, branch] = await Promise.all([
      version.designationId ? Designation.findById(version.designationId).select('name').lean() : null,
      version.departmentId ? Department.findById(version.departmentId).select('name').lean() : null,
      version.managerId ? Employee.findById(version.managerId).select('firstName lastName').lean() : null,
      version.locationId ? Branch.findById(version.locationId).select('name').lean() : null,
    ])

    return ok({
      offerCode: offer.offerCode,
      status: offer.status,
      isActive: !INACTIVE.includes(offer.status),
      candidateName: candidate ? `${candidate.firstName} ${candidate.lastName}` : null,
      jobTitle: job?.publicTitle || job?.jobTitle,
      companyName: claims.tenant.companyName,
      version: {
        version: version.version,
        designation: designation?.name || null,
        department: department?.name || null,
        location: branch?.name || null,
        reportingManager: manager ? `${manager.firstName} ${manager.lastName}` : null,
        joiningDate: version.joiningDate,
        employmentType: version.employmentType,
        workMode: version.workMode,
        ctc: version.ctc,
        probationPeriod: version.probationPeriod,
        noticePeriod: version.noticePeriod,
        offerValidUntil: version.offerValidUntil,
        renderedContent: version.renderedContent,
        pdfUrl: version.pdfUrl,
      },
      expiresAt: offer.expiresAt,
      sentAt: offer.sentAt,
      viewedAt: offer.viewedAt,
      acceptedAt: offer.acceptedAt,
      declinedAt: offer.declinedAt,
      withdrawalReason: offer.status === OFFER_STATUS.WITHDRAWN ? offer.withdrawalReason : null,
      discussionRequestedAt: offer.discussionRequestedAt,
    })
  })
})
