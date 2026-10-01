import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

// Render sets HOSTNAME to the container name. Next standalone may bind to that
// instead of all interfaces, which can leave Render's proxy seeing 502.
process.env.HOSTNAME = '0.0.0.0'
process.env.PORT = process.env.PORT || '3000'

console.log(`Starting NexaHR production server on http://localhost:${process.env.PORT}`)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const standalonePath = path.resolve(__dirname, '../.next/standalone/server.js')

if (fs.existsSync(standalonePath)) {
  await import(standalonePath)
} else {
  console.log('Standalone server.js not found, falling back to next start...')
  const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next')
  const child = spawn(process.execPath, [nextBin, 'start', '-p', process.env.PORT], {
    stdio: 'inherit',
    env: process.env,
  })
  child.on('exit', (code) => process.exit(code || 0))
}

