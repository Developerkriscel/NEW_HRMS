export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import SalaryStructure from '@/models/SalaryStructure'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const structure = await SalaryStructure.findOne({ employee: params.employeeId, tenantId, isActive: true })
  if (!structure) return fail('No active salary structure found for this employee', 404)

  return ok(structure)
})
