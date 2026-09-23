export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || typeof file === 'string') {
    return fail('File is required', 400)
  }

  const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
  const filename = `asset-${Date.now()}.${ext}`
  
  // Save to public/uploads/assets/[tenantId] so it can be served statically
  const dirPath = path.join(process.cwd(), 'public', 'uploads', 'assets', String(tenantId))
  await mkdir(dirPath, { recursive: true })
  
  const absolutePath = path.join(dirPath, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  
  await writeFile(absolutePath, buffer)

  const url = `/uploads/assets/${tenantId}/${filename}`
  
  return ok({ url }, 'Image uploaded successfully')
})
