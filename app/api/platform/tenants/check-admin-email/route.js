export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { checkAdminEmailAvailability } from '@/lib/platformTenancy'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.create')

  const email = new URL(req.url).searchParams.get('email')
  return ok(await checkAdminEmailAvailability(email))
})
