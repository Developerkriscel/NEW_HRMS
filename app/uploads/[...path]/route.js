import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  try {
    const slug = params.path // Array of path segments
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...slug)
    const fileBuffer = await readFile(filePath)
    
    // Guess content type from extension
    const ext = path.extname(filePath).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
    else if (ext === '.png') contentType = 'image/png'
    else if (ext === '.webp') contentType = 'image/webp'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    return new NextResponse('File not found', { status: 404 })
  }
}
