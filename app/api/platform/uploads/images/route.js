export const dynamic = 'force-dynamic'

import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'

const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const MAX_BYTES = 2 * 1024 * 1024
const PURPOSES = new Set(['organization-logo', 'admin-profile'])

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.create')

  const formData = await req.formData()
  const file = formData.get('file')
  const purpose = String(formData.get('purpose') || 'organization-logo')

  if (!PURPOSES.has(purpose)) return fail('Invalid upload purpose', 400, 'INVALID_PURPOSE')
  if (!file || typeof file.arrayBuffer !== 'function') return fail('Image file is required', 400, 'FILE_REQUIRED')
  if (!ALLOWED_TYPES.has(file.type)) return fail('Only JPG, PNG and WEBP images are supported', 400, 'INVALID_FILE_TYPE')
  if (file.size > MAX_BYTES) return fail('Image must be 2 MB or smaller', 400, 'FILE_TOO_LARGE')

  const extension = ALLOWED_TYPES.get(file.type)
  const filename = `${Date.now()}-${randomUUID()}.${extension}`
  const folder = purpose === 'admin-profile' ? 'admin-profiles' : 'organization-logos'
  const directory = path.join(process.cwd(), 'public', 'uploads', 'platform', folder)
  await mkdir(directory, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(directory, filename), buffer)

  // Also return base64 so it works without server restarts for dynamic files
  const base64 = buffer.toString('base64')
  const dataUri = `data:${file.type};base64,${base64}`

  return ok({ url: dataUri }, 'Image uploaded', 201)
})
