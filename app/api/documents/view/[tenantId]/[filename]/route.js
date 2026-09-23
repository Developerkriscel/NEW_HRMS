export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

const STORAGE_ROOT = path.join(process.cwd(), 'output', 'documents')

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'file'
}

export async function GET(req, { params }) {
  try {
    const session = await requireAuth()
    const { tenantId, filename } = params
    
    // Basic security: only allow users in the same tenant
    if (session.tenantId !== tenantId) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename)) {
      return new Response('Invalid filename', { status: 400 })
    }

    const ext = filename.split('.').pop().toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === 'pdf') contentType = 'application/pdf'
    if (ext === 'png') contentType = 'image/png'
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg'

    const absolutePath = path.join(STORAGE_ROOT, sanitizeSegment(tenantId), filename)
    const buffer = await readFile(absolutePath)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`
      }
    })
  } catch (err) {
    console.error('Failed to serve document:', err)
    return new Response('Not Found', { status: 404 })
  }
}
