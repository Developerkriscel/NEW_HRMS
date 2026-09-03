import dotenv from 'dotenv'
import mongoose from 'mongoose'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

dotenv.config({ path: '.env.local' })
dotenv.config()

const cwd = process.cwd()
const expectedFastRoot = 'C:\\Projects\\NexaHR'
const mongoUri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI

function status(ok, message, details = '') {
  const label = ok ? 'OK' : 'WARN'
  console.log(`[${label}] ${message}${details ? `: ${details}` : ''}`)
}

function runPowerShell(script) {
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function checkFilesystem() {
  const normalized = cwd.toLowerCase()
  status(!normalized.includes('\\onedrive\\'), 'Project is outside OneDrive', cwd)
  status(path.resolve(cwd).toLowerCase() === expectedFastRoot.toLowerCase(), 'Using fast project folder', cwd)
  status(!cwd.endsWith('\\NexaHR\\NexaHR'), 'Avoiding nested OneDrive project folder', cwd)
}

function checkNodeProcesses() {
  if (os.platform() !== 'win32') return
  const script = `
    Get-CimInstance Win32_Process |
      Where-Object { $_.Name -match 'node|npm' -and $_.CommandLine -match 'NexaHR' } |
      Select-Object ProcessId,CommandLine |
      ConvertTo-Json -Compress
  `
  const raw = runPowerShell(script)
  const processes = raw ? JSON.parse(raw) : []
  const list = Array.isArray(processes) ? processes : [processes]
  const projectServers = list.filter((p) => String(p.CommandLine || '').toLowerCase().includes('next'))
  const devCommands = projectServers.filter((p) => {
    const command = String(p.CommandLine || '').toLowerCase()
    return command.includes('next') && command.includes(' dev') && !command.includes('start-server.js') && !command.includes('transform.js')
  })
  const oneDriveServers = projectServers.filter((p) => String(p.CommandLine || '').toLowerCase().includes('\\onedrive\\'))
  status(oneDriveServers.length === 0, 'No OneDrive dev server running', oneDriveServers.map((p) => p.ProcessId).join(', '))
  status(devCommands.length <= 1, 'Only one Next dev command expected', `${devCommands.length} dev command(s), ${projectServers.length} Next-related process(es)`)
}

async function checkMongo() {
  if (!mongoUri) {
    status(false, 'MongoDB URI configured', 'missing MONGODB_DIRECT_URI/MONGODB_URI')
    return
  }

  const start = Date.now()
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 4000),
      connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 4000),
      socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 15000),
    })
    const elapsed = Date.now() - start
    status(elapsed < 2000, 'MongoDB connection latency', `${elapsed}ms`)

    const db = mongoose.connection.db
    const [tenants, operators, plans, modules] = await Promise.all([
      db.collection('tenants').countDocuments({}),
      db.collection('superadminusers').countDocuments({}),
      db.collection('plans').countDocuments({}),
      db.collection('modules').countDocuments({}),
    ])
    status(operators > 0, 'Platform operator seeded', `${operators}`)
    status(plans >= 4, 'Plans seeded', `${plans}`)
    status(modules >= 8, 'Platform modules seeded', `${modules}`)
    status(tenants > 0, 'Tenant databases available for HR/company/employee testing', `${tenants}`)
    await mongoose.disconnect()
  } catch (err) {
    status(false, 'MongoDB reachable', err.message.split('\n')[0])
  }
}

console.log('NexaHR performance doctor')
console.log(`cwd: ${cwd}`)
checkFilesystem()
checkNodeProcesses()
await checkMongo()
