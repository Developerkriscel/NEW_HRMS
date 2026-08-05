export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'

// Stub — no Asset module exists on the backend (this rewrite included),
// matching the original.
export const GET = withApi(async () => {
  await requireAuth()
  return ok([])
})
