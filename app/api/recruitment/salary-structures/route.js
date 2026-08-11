export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { COMPENSATION_VIEW_ROLES } from '@/lib/compensationConstants'
import SalaryStructure from '@/models/SalaryStructure'

// GET — a lightweight read of the *existing* Payroll salary structures for
// the "Salary Structure Template" dropdown (item 6). Deliberately shallow:
// list + ctc/basicPercent/hraPercent so the proposal form can pre-fill,
// nothing deeper — "don't turn Recruitment into a full payroll engine."
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const structures = await SalaryStructure.find({ tenantId, deleted: false, isActive: true })
    .select('name description ctc basicPercent hraPercent conveyanceAllowance medicalAllowance')
    .sort({ name: 1 })
    .lean()

  return ok(structures)
})
