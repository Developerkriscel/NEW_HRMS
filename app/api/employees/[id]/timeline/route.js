export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'

// Stub — matches the original backend, which never implemented an actual
// employment-history timeline (promotions, transfers, etc.).
export const GET = withApi(async () => {
  await requireAuth()
  return ok({ events: [] })
})
