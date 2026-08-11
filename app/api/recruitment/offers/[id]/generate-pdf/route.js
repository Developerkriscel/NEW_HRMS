export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers, OFFER_VERSION_STATUS } from '@/lib/offerConstants'
import { generateOfferPdfBuffer } from '@/lib/offerPdfGenerator'
import { saveOfferPdf } from '@/lib/offerStorage'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import Tenant from '@/models/Tenant'

// POST — "Generate final offer PDF only from approved version" (item 12).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManageOffers(session)) return fail('You do not have permission to generate this PDF', 403, 'FORBIDDEN')

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')
  const version = await OfferVersion.findOne({ _id: offer.currentVersionId, tenantId })
  if (!version) throw new ApiError(404, 'Offer version not found', 'NOT_FOUND')
  if (version.status !== OFFER_VERSION_STATUS.APPROVED) {
    return fail('The offer PDF can only be generated from an approved version', 400, 'INVALID_STATE')
  }

  const tenant = await Tenant.findById(tenantId).select('companyName').lean()
  const buffer = await generateOfferPdfBuffer({ companyName: tenant?.companyName, offerCode: `${offer.offerCode} · V${version.version}`, bodyText: version.renderedContent })
  const { url } = await saveOfferPdf(buffer, tenantId, offer.offerCode, version.version)

  version.pdfUrl = url
  await version.save()

  await logAction(session, { action: 'OFFER_PDF_GENERATED', entityType: 'Offer', entityId: offer._id, description: `PDF generated for offer V${version.version}`, req })

  return ok({ offer, version }, 'Offer PDF generated')
})
