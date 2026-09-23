export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withApi } from '@/lib/handler'
import { fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolveOfferTokenClaims } from '@/lib/offerTokenHelpers'
import { loadOfferByToken } from '@/lib/offerHelpers'
import { readOfferPdf } from '@/lib/offerStorage'

export const GET = withApi(async (req, { params }) => {
  const claims = await resolveOfferTokenClaims(params.token)
  if (!claims) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')

  return runForTenant(claims.tenant, async () => {
    const loaded = await loadOfferByToken(claims.tenant._id, claims.offerId, claims.jti)
    if (!loaded) return fail('This offer link is invalid', 404, 'INVALID_TOKEN')

    const attachment = (loaded.version?.attachments || []).find((item) => item.fileName === params.filename)
    if (!attachment) return fail('Attachment not found', 404, 'NOT_FOUND')

    const buffer = await readOfferPdf(claims.tenant._id, attachment.fileName)
    if (!buffer) return fail('Attachment file not found', 404, 'NOT_FOUND')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.contentType || 'application/pdf',
        'Content-Disposition': `inline; filename="${attachment.originalFileName || attachment.fileName}"`,
      },
    })
  })
})
