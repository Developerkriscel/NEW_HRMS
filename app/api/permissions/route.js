export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Permission from '@/models/Permission'

// Lists the tenant's own seeded copy of the permission catalog (grouped by
// module) — seeded once per tenant at provisioning time from the canonical
// list in scripts/seed.mjs. Any authenticated tenant employee can read this;
// only a Company Admin can actually grant permissions (see
// app/api/employees/[id]/permissions/route.js).
export const GET = withApi(async () => {
  const session = await requireAuth()
  requireTenantId(session)

  const permissions = await Permission.find({ deleted: false }).sort({ module: 1, name: 1 })
  return ok(permissions)
})
