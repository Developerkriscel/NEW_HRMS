export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'

export const GET = withApi(async () => {
  await requireAuth()
  return fail('AI integration is now centrally managed in the Super Admin settings panel.', 403, 'AI_CENTRALIZED_MANAGEMENT')
})

export const PUT = withApi(async () => {
  await requireAuth()
  return fail('AI integration is now centrally managed in the Super Admin settings panel.', 403, 'AI_CENTRALIZED_MANAGEMENT')
})
