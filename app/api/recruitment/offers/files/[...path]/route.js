export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withApi } from '@/lib/handler'
import { fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { OFFER_VIEW_ROLES } from '@/lib/offerConstants'
import { readOfferPdf } from '@/lib/offerStorage'

// GET /api/recruitment/offers/files/{tenantId}/{filename} — authenticated
// HR-side PDF viewer, same shape as .../resumes/[...path]/route.js. The
// candidate-facing download uses a separate, token-gated route instead
// (app/api/public/offers/[token]/pdf).
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const segments = params.path || []
  if (segments.length !== 2 || segments[0] !== tenantId) return fail('Not found', 404, 'NOT_FOUND')

  const buffer = await readOfferPdf(tenantId, segments[1])
  if (!buffer) return fail('Offer PDF not found', 404, 'NOT_FOUND')

  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${segments[1]}"` },
  })
})
