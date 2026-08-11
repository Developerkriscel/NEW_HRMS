export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withApi } from '@/lib/handler'
import { fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolveOfferTokenClaims } from '@/lib/offerTokenHelpers'
import { loadOfferByToken } from '@/lib/offerHelpers'
import { generateOfferPdfBuffer } from '@/lib/offerPdfGenerator'
import { saveOfferPdf, readOfferPdf } from '@/lib/offerStorage'

// GET — "[View Full Offer]" / download. Generates the PDF on demand if HR
// never explicitly clicked Generate PDF before sending, so the candidate
// is never blocked on that.
export const GET = withApi(async (req, { params }) => {
  const claims = await resolveOfferTokenClaims(params.token)
  if (!claims) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')

  return runForTenant(claims.tenant, async () => {
    const loaded = await loadOfferByToken(claims.tenant._id, claims.offerId, claims.jti)
    if (!loaded) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')
    const { offer, version } = loaded
    if (!version) return fail('This offer is not available', 404, 'NOT_FOUND')

    let buffer = null
    const filename = version.pdfUrl?.split('/').pop()
    if (filename) buffer = await readOfferPdf(claims.tenant._id, filename)

    if (!buffer) {
      buffer = await generateOfferPdfBuffer({ companyName: claims.tenant.companyName, offerCode: `${offer.offerCode} · V${version.version}`, bodyText: version.renderedContent })
      const saved = await saveOfferPdf(buffer, claims.tenant._id, offer.offerCode, version.version)
      version.pdfUrl = saved.url
      await version.save()
    }

    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${offer.offerCode}.pdf"` },
    })
  })
})
