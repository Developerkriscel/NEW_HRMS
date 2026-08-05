export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import EmployeeDocument from '@/models/EmployeeDocument'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const document = await EmployeeDocument.findOne({ _id: params.id, tenantId, deleted: false })
  if (!document) return fail('Document not found', 404)

  for (const field of ['title', 'category', 'fileUrl', 'status', 'expiresAt', 'notes']) {
    if (body[field] !== undefined) document[field] = body[field]
  }
  document.updatedBy = session.sub
  await document.save()

  await logAction(session, {
    action: 'DOCUMENT_UPDATED',
    entityType: 'EmployeeDocument',
    entityId: document._id,
    description: `Document "${document.title}" updated`,
  })

  return ok(document, 'Document updated')
})
