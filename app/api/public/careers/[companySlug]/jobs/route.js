export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { getPublicJobsList } from '@/lib/publicJobHelpers'

// Public, unauthenticated — every OPEN + PUBLIC job with an active
// career-page listing for this tenant. No requireAuth/requireTenantId here
// on purpose; the tenant comes from the :companySlug URL segment instead,
// resolved inside getPublicJobsList. Still routed through withApi for the
// same connectDB/error-envelope handling every other route gets.
export const GET = withApi(async (req, { params }) => {
  const { searchParams } = new URL(req.url)
  const filters = {
    department: searchParams.get('department') || undefined,
    location: searchParams.get('location') || undefined,
    workMode: searchParams.get('workMode') || undefined,
    employmentType: searchParams.get('employmentType') || undefined,
    experience: searchParams.get('experience') || undefined,
    search: searchParams.get('search') || undefined,
  }

  const result = await getPublicJobsList(params.companySlug, filters)
  if (result === null) return fail('Company not found', 404, 'NOT_FOUND')

  return ok(result)
})
