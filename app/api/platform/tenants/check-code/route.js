export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { checkCompanyCodeAvailability } from '@/lib/platformTenancy'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.create')

  const code = new URL(req.url).searchParams.get('code')
  return ok(await checkCompanyCodeAvailability(code))
})
