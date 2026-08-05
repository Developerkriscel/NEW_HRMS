export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole } from '@/lib/auth'

// Stub — matches the original: accepts the upload but never actually
// parses/creates employees from it.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const formData = await req.formData()
  const file = formData.get('file')

  return ok({ fileName: file?.name || null, status: 'PROCESSING' }, 'Bulk import queued')
})
