export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { getPublicJobBySlug } from '@/lib/publicJobHelpers'

// GET /api/public/careers/:companySlug/jobs/:slug — public, unauthenticated.
// The folder is named [slugOrId] only because Next.js requires one dynamic
// segment name per route-tree position and the sibling apply/ route below
// needs the same position to mean "job id" instead — this route only ever
// treats it as a slug.
export const GET = withApi(async (req, { params }) => {
  const job = await getPublicJobBySlug(params.companySlug, params.slugOrId)
  if (!job) return fail('Job not found', 404, 'NOT_FOUND')
  return ok(job)
})
