export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { checkSubdomainAvailability } from '@/lib/platformTenancy'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.create')

  const subdomain = new URL(req.url).searchParams.get('subdomain')
  return ok(await checkSubdomainAvailability(subdomain))
})
